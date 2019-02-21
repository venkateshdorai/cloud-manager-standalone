package org.aludratest.cloud.web.impl.rest;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class HomeController {

	@RequestMapping("/")
	public String index() {
		return "redirect:webapp/index.html";
	}

	@RequestMapping(value = "/webapp/**/{[path:[^\\.]*}")
	public String angular() {
		return "forward:/webapp/index.html";
	}

}
