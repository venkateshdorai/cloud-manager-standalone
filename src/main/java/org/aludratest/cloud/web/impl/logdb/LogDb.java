package org.aludratest.cloud.web.impl.logdb;

import java.io.File;
import java.lang.reflect.UndeclaredThrowableException;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import javax.annotation.PostConstruct;
import javax.sql.rowset.CachedRowSet;

import org.aludratest.cloud.event.ManagedResourceRequestCanceledEvent;
import org.aludratest.cloud.event.ManagedResourceRequestEvent;
import org.aludratest.cloud.event.ManagedResourceRequestStateChangedEvent;
import org.aludratest.cloud.event.ResourceRequestReceivedEvent;
import org.aludratest.cloud.manager.ManagedResourceRequest;
import org.aludratest.cloud.manager.ResourceManager;
import org.aludratest.cloud.request.ResourceRequest;
import org.aludratest.cloud.resource.Resource;
import org.aludratest.cloud.resource.ResourceType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Component hosting the DatabaseRequestLogger thread and reacting to resource
 * request events (logging them into the internal Derby DB). Also forwards the
 * <code>populateQuery()</code> method.
 *
 * @author falbrech
 *
 */
@Component
public class LogDb {

	private DatabaseRequestLogger requestLogger;

	private Thread requestLoggerThread;

	private LogDbAccess db;

	@Value("${acm.db.home:}")
	private String acmDbHome;

	@Value("${acm.db.port:}")
	private Integer port;

	private Map<ResourceRequest, Long> requestDbIds = new HashMap<>();

	private ResourceManager resourceManager;

	@Autowired
	public LogDb(ResourceManager resourceManager) {
		this.resourceManager = resourceManager;
	}

	@PostConstruct
	private void initializeLogger() {
		// determine ACM DB home; if not set, use ~/.atcloudmanager/db
		if (StringUtils.isEmpty(acmDbHome)) {
			acmDbHome = new File(new File(System.getProperty("user.home")), ".atcloudmanager/db").getAbsolutePath();
		}

		File f = new File(acmDbHome);
		if (!f.isDirectory()) {
			f.mkdirs();
		}

		try {
			db = new LogDbAccess(f, port);
			requestLogger = new DatabaseRequestLogger(db);
			requestLoggerThread = new Thread(requestLogger);
			requestLoggerThread.start();
		}
		catch (Exception e) {
			throw new UndeclaredThrowableException(e);
		}
	}

	@EventListener
	public void handleContextClosed(ContextClosedEvent event) {
		if (requestLoggerThread != null) {
			requestLoggerThread.interrupt();
			requestLoggerThread = null;
		}

		if (db != null) {
			db.shutdown();
			db = null;
		}
	}

	@EventListener
	public void handleResourceRequestReceivedEvent(ResourceRequestReceivedEvent event) {
		long dbRequestId = requestLogger.createRequestLog(event.getRequest().getRequestingUser(),
				event.getRequest().getJobName());
		requestDbIds.put(event.getRequest(), dbRequestId);
	}

	@EventListener
	public void handleResourceRequestStateChangedEvent(ManagedResourceRequestStateChangedEvent event) {
		Long dbRequestId = requestDbIds.get(event.getRequest());
		if (dbRequestId != null) {
			switch (event.getNewState()) {
				case WAITING:
				case READY:
					// not logged yet
					break;
				case WORKING:
					Resource resource = getSafeResource(event);
					if (resource != null) {
						requestLogger.updateRequestLogWorkStarted(dbRequestId.longValue(), resource.getResourceType().getName(),
								resource.toString());
					}
					break;
				case ORPHANED:
				case FINISHED:
					resource = getSafeResource(event);
					int cnt = resource != null ? countRemainingResources(resource.getResourceType()) : 0;
					requestLogger.updateRequestLogWorkDone(dbRequestId.longValue(), event.getNewState().toString(), cnt);
					break;
			}
		}
	}

	@EventListener
	public void handleResourceRequestCanceledEvent(ManagedResourceRequestCanceledEvent event) {
		Long dbRequestId = requestDbIds.get(event.getRequest());
		if (dbRequestId != null) {
			Resource resource = getSafeResource(event);
			int cnt = resource != null ? countRemainingResources(resource.getResourceType()) : 0;
			requestLogger.updateRequestLogWorkDone(dbRequestId.longValue(), "CANCELED", cnt);
		}
	}

	public CachedRowSet populateQuery(String query) throws SQLException {
		return db.populateQuery(query);
	}

	private Resource getSafeResource(ManagedResourceRequestEvent event) {
		ManagedResourceRequest request = event.getManagedRequest();
		Future<Resource> future = request.getResourceFuture();
		if (future != null) {
			try {
				return future.get(10, TimeUnit.MILLISECONDS);
			}
			catch (TimeoutException | InterruptedException | ExecutionException e) {
				return null;
			}
		}
		return null;
	}

	private int countRemainingResources(ResourceType resourceType) {
		Iterator<? extends ManagedResourceRequest> iter = resourceManager.getManagedRequests();
		int cnt = 0;
		while (iter.hasNext()) {
			ManagedResourceRequest request = iter.next();
			if (resourceType.equals(request.getRequest().getResourceType())
					&& request.getState() == ManagedResourceRequest.State.WORKING) {
				cnt++;
			}
		}

		return cnt;
	}

}
