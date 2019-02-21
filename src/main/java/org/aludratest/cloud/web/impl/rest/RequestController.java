package org.aludratest.cloud.web.impl.rest;

import org.aludratest.cloud.user.StoreException;
import org.aludratest.cloud.user.User;
import org.aludratest.cloud.user.admin.UserDatabaseRegistry;
import org.aludratest.cloud.web.rest.AbstractRestController;
import org.aludratest.cloud.web.util.BasicAuthUtil;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

/**
 * @author falbrech
 * @deprecated Currently, no generic endpoint for resource requests - use module
 *             specific endpoints
 *
 */
@Deprecated
// @Controller
public class RequestController extends AbstractRestController {

	private static final Log LOG = LogFactory.getLog(RequestController.class);

	private UserDatabaseRegistry userDatabaseRegistry;

	private ClientRequestHandlerImpl requestHandler;

	// @Autowired
	public RequestController(UserDatabaseRegistry userDatabaseRegistry, ClientRequestHandlerImpl requestHandler) {
		this.userDatabaseRegistry = userDatabaseRegistry;
		this.requestHandler = requestHandler;
	}

	// @RequestMapping(value = "/resource", method = RequestMethod.POST, consumes =
	// MediaType.APPLICATION_JSON_VALUE, produces =
	// MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<String> handleResourceRequest(@RequestBody String jsonRequest, @RequestHeader("Authorization") String authorization) {
		User user;
		try {
			user = BasicAuthUtil.authenticate(authorization, userDatabaseRegistry.getSelectedUserDatabase());
		}
		catch (IllegalArgumentException e) {
			return createErrorObject(e);
		}
		catch (StoreException e) {
			LOG.error("Could not authenticate user due to StoreException", e);
			return createErrorObject("Internal error, please contact the system administrator", e,
					HttpStatus.INTERNAL_SERVER_ERROR.value());
		}

		try {
			JSONObject requestObject = new JSONObject(jsonRequest);
			JSONObject resultObject = requestHandler.handleResourceRequest(user, requestObject);
			return ResponseEntity.ok(resultObject.toString());
		}
		catch (JSONException e) {
			LOG.debug("JSON exception occurred. Sending BAD_REQUEST.", e);
			return createErrorObject("Invalid JSON format", e, HttpStatus.BAD_REQUEST.value());
		}
	}

	// @RequestMapping(value = "/resource/{requestId}", method =
	// RequestMethod.DELETE)
	public ResponseEntity<String> releaseResource(@PathVariable("requestId") String requestId) {
		if (requestHandler.handleReleaseRequest(requestId)) {
			return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
		}
		return ResponseEntity.notFound().build();
	}


}
