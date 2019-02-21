import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserService } from './user.service';
import { Observable } from 'rxjs/Observable';

interface ConfigProperty {
    key: string;
    value: (string|boolean|number);
    description?: string;
}

export interface BasicConfig {
    hostName: string;

    useProxy: boolean;

    proxyHost: string;

    proxyPort: number;

    bypassProxyRegex: string;
}

export interface SeleniumConfig {
    seleniumTimeout: number;
    port: number;
    maxIdleTimeBetweenCommands: number;
    healthCheckInterval: number;
}

@Injectable()
export class ConfigService {

    constructor(private http: HttpClient, private userService: UserService) {
    }

    getBasicConfiguration(): Observable<BasicConfig> {
        return this.http.get('/api/config', { headers: this.userService.createJwtHeader() }).map(
            (d: any) => this.toBasicConfig(d.result.config));
    }

    getSeleniumConfiguration(): Observable<SeleniumConfig> {
        return this.http.get('/api/selenium/config', { headers: this.userService.createJwtHeader() }).map((d: any) => d.result);
    }

    setBasicConfiguration(config: BasicConfig): Observable<BasicConfig> {
        const headers = this.userService.createJwtHeader().set('Content-Type', 'application/x-www-form-urlencoded');

        let bodyConfig: any;
        if (config.useProxy) {
            bodyConfig = config;
        }
        else {
            bodyConfig = {
                hostName: config.hostName,
                useProxy: false
            };
        }

        return this.http.post('/api/config', this.toQueryString(bodyConfig), { headers: headers }).map(
            (d: any) => this.toBasicConfig(d.result.config));
    }

    setSeleniumConfiguration(config: SeleniumConfig): Observable<SeleniumConfig> {
        const headers = this.userService.createJwtHeader().set('Content-Type', 'application/json');
        return this.http.post('/api/selenium/config', config, { headers: headers }).map((d: any) => d.result);
    }

    private toBasicConfig(properties: Array<ConfigProperty>): BasicConfig {
        return {
            hostName: <string>properties.filter(p => p.key === 'hostName')[0].value,
            useProxy: <boolean>properties.filter(p => p.key === 'useProxy')[0].value,
            proxyHost: <string>properties.filter(p => p.key === 'proxyHost')[0].value,
            proxyPort: <number>properties.filter(p => p.key === 'proxyPort')[0].value,
            bypassProxyRegex: <string>properties.filter(p => p.key === 'bypassProxyRegex')[0].value
        };
    }

    private toQueryString(obj: any): string {
        return Object.keys(obj).filter(k => obj.hasOwnProperty(k)).map(
            k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&');
    }
}
