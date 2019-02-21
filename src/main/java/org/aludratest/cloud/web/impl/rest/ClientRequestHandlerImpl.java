/*
 * Copyright (C) 2010-2015 AludraTest.org and the contributors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.aludratest.cloud.web.impl.rest;

import java.sql.SQLException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Optional;
import java.util.Spliterator;
import java.util.Spliterators;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

import org.aludratest.cloud.impl.request.ClientRequestImpl;
import org.aludratest.cloud.manager.ManagedResourceRequest;
import org.aludratest.cloud.manager.ResourceManager;
import org.aludratest.cloud.manager.ResourceManagerException;
import org.aludratest.cloud.module.ResourceModule;
import org.aludratest.cloud.module.ResourceModuleRegistry;
import org.aludratest.cloud.resource.Resource;
import org.aludratest.cloud.resource.UsableResource;
import org.aludratest.cloud.resource.writer.JSONResourceWriter;
import org.aludratest.cloud.resource.writer.ResourceWriterFactory;
import org.aludratest.cloud.selenium.util.GateKeeper;
import org.aludratest.cloud.user.User;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Core class for handling incoming resource requests. This class passes
 * requests to the application's resource manager and listens on request status
 * changes, e.g. a resource becoming available. <br>
 * <br>
 * All request input / output is done on a JSON object basis. An object passed
 * to {@link #handleResourceRequest(User, JSONObject)} should look like this:
 *
 * <pre>
 * { resourceType: 'selenium', jobName: 'Nightly test run', niceLevel: -2, customAttributes: { someKey: 'someValue' } }
 * </pre>
 *
 * <code>niceLevel</code> is optional and defaults to 0. <br>
 * <code>jobName</code> is optional and defaults to <code>null</code>. <br>
 * <code>customAttributes</code> do not need to be specified. <br>
 * <br>
 * The method {@link #handleResourceRequest(User, JSONObject)} will wait up to
 * 10 seconds for a resource to become available for the request. If the request
 * is still waiting for a resource after this time, the method will return a
 * JSON object containing the assigned request ID and a flag that the request is
 * still waiting:
 *
 * <pre>
 * { requestId: 'abc123', waiting: true }
 * </pre>
 *
 * If you receive such a JSON object from this method, you have up to 60 seconds
 * time to again query for this request, now specifying the request ID:
 *
 * <pre>
 * handler.handleResourceRequest(user, new JSONObject(&quot;{requestId: 'abc123'}&quot;));
 * </pre>
 *
 * If a resource has become available in the meantime or within 10 seconds from
 * the new invocation, a positive JSON object containing the resource
 * information is returned:
 *
 * <pre>
 * { requestId: 'abc123', resourceType: 'selenium', resource: { url: 'http://acm.myintra.int:8080/acm/proxy1' }}
 * </pre>
 *
 * Note that the <code>resource</code> object within the result object is
 * defined by the requested resource type and its JSON resource writer. <br>
 * If you do not re-query a request within 60 seconds after receiving a
 * "waiting" response, the handler will signal the resource manager to abort the
 * request. <br>
 *
 * @author falbrech
 * @deprecated Resource modules should have their own API dependent connectors
 *             (e.g. Selenium: WebDriver compatible connector)
 *
 */
@Component
@Deprecated
public class ClientRequestHandlerImpl {

	private static final Logger LOG = LoggerFactory.getLogger(ClientRequestHandlerImpl.class);

	@Autowired
	private ResourceManager manager;

	@Autowired
	private ResourceModuleRegistry resourceModuleRegistry;

	private GateKeeper gateKeeper = new GateKeeper(50, TimeUnit.MILLISECONDS);

	/**
	 * Handles the given resource request, which can be a new request or a reference
	 * to a previously submitted one. See class Javadoc for details on the JSON
	 * object parameter.
	 *
	 * @param user
	 *            User submitting the request.
	 * @param object
	 *            Request object.
	 * @return JSON object describing the received resource, or indicating that the
	 *         request is still waiting for a resource to receive.
	 *
	 * @throws JSONException
	 *             If the input JSON object is invalid.
	 */
	public JSONObject handleResourceRequest(User user, JSONObject object) throws JSONException {
		try {
			gateKeeper.enter();
		}
		catch (InterruptedException e) {
			return createErrorObject("ACM service is shutting down");
		}

		LOG.debug("Handling resource request for user " + user);
		try {
			// if there is already a request ID, get query belonging to it
			if (object.has("requestId")) {
				String requestId = object.getString("requestId");
				return waitForFuture(requestId);
			}

			ResourceModule module = resourceModuleRegistry.getResourceModule(object.getString("resourceType"));
			if (module == null) {
				return createErrorObject("Unknown resource type");
			}

			// build resource request out of request

			// check if there are custom attributes
			Map<String, String> attributes = new HashMap<String, String>();
			if (object.has("customAttributes")) {
				JSONObject attrs = object.getJSONObject("customAttributes");
				Iterator<?> keys = attrs.keys();
				while (keys.hasNext()) {
					String key = keys.next().toString();
					attributes.put(key, attrs.getString(key));
				}
			}

			// check for a name
			String name = "unnamed job";
			if (object.has("jobName")) {
				name = object.getString("jobName");
			}

			String requestId = generateUniqueRequestKey();
			ClientRequestImpl request = new ClientRequestImpl(requestId, user, module.getResourceType(),
					object.optInt("niceLevel", 0), name, attributes);

			// returns immediately; we do not store the managed request here
			ManagedResourceRequest managedRequest = manager.handleResourceRequest(request);
			LOG.debug("Request " + requestId + " started");
			return waitForFuture(managedRequest, requestId);
		}
		catch (SQLException e) {
			return createErrorObject(e);
		}
		catch (ResourceManagerException e) {
			return createErrorObject(e);
		}
	}

	/**
	 * Handles a request to release the resource which has been assigned to the
	 * given resource request.
	 *
	 * @param requestId
	 *            ID of the resource request to release the assigned resource of.
	 *
	 * @return <code>true</code> if the request was found and the resource has been
	 *         released, <code>false</code> if no request with the given ID exists, or was not created by given user.
	 */
	public boolean handleReleaseRequest(String requestId) {
		LOG.debug("Trying to release resource for request " + requestId);
		Optional<? extends ManagedResourceRequest> opRequest = getRequest(requestId);
		if (!opRequest.isPresent()) {
			LOG.debug("No request found to release with ID " + requestId);
			return false;
		}

		ManagedResourceRequest request = opRequest.get();
		LOG.debug("Releasing resource for request " + requestId);

		// if the future is not yet completed (no resource received), cancel instead
		if (!request.getResourceFuture().isDone()) {
			return request.getResourceFuture().cancel(false);
		}

		Resource resource;
		try {
			resource = opRequest.get().getResourceFuture().get();
		}
		catch (InterruptedException | ExecutionException e) {
			return false;
		}

		if (resource instanceof UsableResource) {
			((UsableResource) resource).stopUsing();
		}

		return true;
	}

	/**
	 * Signals that the resource request with the given ID shall be aborted, i.e. no longer wants to receive a resource.
	 *
	 * @param requestId
	 *            ID of the request to abort.
	 */
	public void abortWaitingRequest(String requestId) {
		LOG.debug("Abort waiting request " + requestId);
		Optional<? extends ManagedResourceRequest> opRequest = getRequest(requestId);
		if (!opRequest.isPresent()) {
			return;
		}

		opRequest.get().getResourceFuture().cancel(false);
	}

	private Optional<? extends ManagedResourceRequest> getRequest(final String requestId) {
		return streamRequests()
				.filter((request) -> request.getRequest() instanceof ClientRequestImpl
						&& requestId.equals(((ClientRequestImpl) request.getRequest()).getRequestId()))
				.findFirst();
	}

	private JSONObject waitForFuture(final String requestId) throws JSONException, SQLException {
		Optional<? extends ManagedResourceRequest> opRequest = getRequest(requestId);

		if (!opRequest.isPresent()) {
			return createErrorObject("Invalid request ID, or request has timed out");
		}

		return waitForFuture(opRequest.get(), requestId);
	}

	private JSONObject waitForFuture(ManagedResourceRequest request, String requestId)
			throws JSONException, SQLException {
		if (request.getResourceFuture().isCancelled()) {
			return createErrorObject("Request has timed out");
		}

		try {
			// wait for max 10 seconds - if it takes longer -> TimeoutException
			Resource resource = request.getResourceFuture().get(10, TimeUnit.SECONDS);

			if (request.getRequest() instanceof ClientRequestImpl) {
				startWorking(resource, (ClientRequestImpl) request.getRequest());

				ResourceWriterFactory factory = resourceModuleRegistry
						.getResourceWriterFactory(resource.getResourceType());
				factory.getResourceWriter(JSONResourceWriter.class);
				JSONResourceWriter writer = factory.getResourceWriter(JSONResourceWriter.class);

				// wrap it with meta object
				JSONObject resultObject = new JSONObject();
				resultObject.put("resourceType", resource.getResourceType().getName());
				resultObject.put("resource", writer.writeToJSON(resource));
				resultObject.put("requestId", ((ClientRequestImpl) request.getRequest()).getRequestId());
				LOG.debug("Telling request " + requestId + " to use resource " + resource);

				return resultObject;
			}

			return createErrorObject("Internal error - received invalid request type");

		}
		catch (ExecutionException e) {
			LOG.error("Execution exception when waiting for resource", e);
			return createErrorObject(e.getMessage());
		}
		catch (InterruptedException e) {
			return createErrorObject("AludraTest Cloud Manager server is shutting down");
		}
		catch (TimeoutException e) {
			JSONObject result = new JSONObject();
			if (request.getRequest() instanceof ClientRequestImpl) {
				result.put("requestId", ((ClientRequestImpl) request.getRequest()).getRequestId());
			}
			result.put("waiting", true);
			return result;
		}
	}

	private void startWorking(Resource resource, ClientRequestImpl request)
			throws SQLException {
		// start using resource, if it does not auto-detect this
		if (resource instanceof UsableResource) {
			((UsableResource) resource).startUsing();
		}

		// TODO fire application event

	}

	private Stream<? extends ManagedResourceRequest> streamRequests() {
		return StreamSupport.stream(Spliterators.spliteratorUnknownSize(manager.getManagedRequests(), Spliterator.ORDERED),
				false);
	}

	private Stream<ClientRequestImpl> streamClientRequests() {
		return streamRequests().filter((r) -> (r.getRequest() instanceof ClientRequestImpl))
				.map((r) -> (ClientRequestImpl) r.getRequest());
	}

	private String generateUniqueRequestKey() {
		final StringBuilder key = new StringBuilder();
		do {
			if (key.length() > 0) {
				key.delete(0, key.length() - 1);
			}
			for (int i = 0; i < 16; i++) {
				key.append(Integer.toHexString((int) (Math.random() * 16)));
			}
		}
		while (streamClientRequests().anyMatch((r) -> key.toString().equals(r.getRequestId())));
		return key.toString();
	}

	private JSONObject createErrorObject(Throwable t) throws JSONException {
		return createErrorObject(t.getMessage());
	}

	private JSONObject createErrorObject(String errorMessage) throws JSONException {
		JSONObject result = new JSONObject();
		result.put("errorMessage", errorMessage);
		return result;
	}

	// for debugging purposes
	JSONArray getRequestQueries() throws JSONException {
		JSONArray result = new JSONArray();

		streamClientRequests().forEach((request) -> {
			JSONObject obj = new JSONObject();
			try {
				obj.put("requestId", request.getRequestId());

				JSONObject req = new JSONObject();
				req.put("jobName", request.getJobName());
				req.put("user", request.getRequestingUser().getName());

				obj.put("request", req);
				result.put(obj);
			}
			catch (JSONException e) {
				throw new RuntimeException(e);
			}
		});

		return result;
	}

}
