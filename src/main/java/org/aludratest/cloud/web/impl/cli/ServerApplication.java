package org.aludratest.cloud.web.impl.cli;

import org.aludratest.cloud.app.CloudManagerApp;
import org.aludratest.cloud.config.ConfigException;
import org.aludratest.cloud.web.impl.logdb.LogDb;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.context.event.EventListener;

@SpringBootApplication(scanBasePackages = "org.aludratest.cloud")
public class ServerApplication implements CommandLineRunner {

	/**
	 * This component configures itself and starts up as soon as it is created.
	 */
	@Autowired
	private LogDb logDb;

	@Autowired
	private CloudManagerApp application;

	public static void main(String[] args) {
		SpringApplication.run(new Class[] { ServerApplication.class }, args);
	}

	@Override
	public void run(String... args) throws Exception {
		// touch object to ensure bean creation
		logDb.getClass();

		try {
			application.start();
		}
		catch (ConfigException e) {
			LogFactory.getLog(ServerApplication.class).error("Invalid ACM configuration", e);
		}
	}

	@EventListener
	public void handleContextClosed(ContextClosedEvent event) {
		application.shutdown();
	}

}
