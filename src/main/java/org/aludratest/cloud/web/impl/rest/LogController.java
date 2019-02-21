package org.aludratest.cloud.web.impl.rest;

import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.Locale;

import javax.sql.rowset.CachedRowSet;

import org.aludratest.cloud.web.impl.logdb.LogDb;
import org.aludratest.cloud.web.rest.AbstractRestController;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class LogController extends AbstractRestController {

	@Autowired
	private LogDb logDb;

	@PreAuthorize("hasAuthority('ROLE_ADMIN')")
	@RequestMapping(value = "/api/logdb", method = RequestMethod.GET, produces = JSON_TYPE)
	public ResponseEntity<String> executeLogQuery(@RequestParam("query") String query) {
		// quick check: Query must start with SELECT (note: this is not enough to
		// prevent modification)
		if (!query.trim().toLowerCase(Locale.US).startsWith("select")) {
			return createErrorObject("Invalid log query", new IllegalArgumentException("Invalid log query"));
		}

		try {
			CachedRowSet rowSet = logDb.populateQuery(query);
			return wrapResultObject(toJson(rowSet));
		} catch (SQLException e) {
			return createErrorObject("Error when executing log query", e);
		}
	}

	private JSONObject toJson(CachedRowSet rowSet) throws SQLException {
		JSONObject result = new JSONObject();
		result.put("columns", buildColumnsArray(rowSet));
		result.put("data", buildDataArray(rowSet));

		return result;
	}

	private JSONArray buildColumnsArray(CachedRowSet rowSet) throws SQLException {
		JSONArray result = new JSONArray();
		ResultSetMetaData metaData = rowSet.getMetaData();

		for (int i = 1; i <= metaData.getColumnCount(); i++) {
			JSONObject col = new JSONObject();
			col.put("type", metaData.getColumnTypeName(i));
			col.put("label", metaData.getColumnLabel(i));
			result.put(col);
		}

		return result;
	}

	private JSONArray buildDataArray(CachedRowSet rowSet) throws SQLException {
		JSONArray result = new JSONArray();
		int colCount = rowSet.getMetaData().getColumnCount();

		while (rowSet.next()) {
			JSONObject row = new JSONObject();
			for (int i = 1; i <= colCount; i++) {
				row.put("" + i, rowSet.getString(i));
			}
			result.put(row);
		}

		return result;
	}

}
