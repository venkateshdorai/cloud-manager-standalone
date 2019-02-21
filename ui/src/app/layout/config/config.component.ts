import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { ConfigService, SeleniumConfig, BasicConfig } from '../../shared/services/config.service';

const BASIC_ERROR_PREFIX = 'Error saving Basic configuration: ';
const SELENIUM_ERROR_PREFIX = 'Error saving Selenium configuration: ';

@Component({
    selector: 'app-config',
    templateUrl: './config.component.html',
    styleUrls: ['./config.component.scss']
})
export class ConfigComponent implements OnInit {

    private config: BasicConfig = null;

    private seleniumConfig: SeleniumConfig = null;

    public clientSeleniumURL = '';


    public alerts: Array<any> = [];

    public configForm = new FormGroup({
        basic: new FormGroup({
            hostName: new FormControl(),
            useProxy: new FormControl(),
            proxyHost: new FormControl(),
            proxyPort: new FormControl(),
            bypassProxyRegex: new FormControl()
         }),
         selenium: new FormGroup({
             port: new FormControl(),
             healthCheckInterval: new FormControl(),
             seleniumTimeout: new FormControl(),
             maxIdleTime: new FormControl()
         })
    });

    constructor(public fb: FormBuilder, public configService: ConfigService) {
    }

    ngOnInit() {
        this.configService.getBasicConfiguration().subscribe(config => { this.config = config; this.buildConfig(); });
        this.configService.getSeleniumConfiguration().subscribe(seleniumConfig => { this.seleniumConfig = seleniumConfig;
            this.buildConfig(); });
    }

    buildConfig() {
        if (this.config) {
            const cg = this.configForm.get('basic');
            cg.get('hostName').setValue(this.config.hostName);
            cg.get('useProxy').setValue(this.config.useProxy);
            cg.get('useProxy').valueChanges.subscribe((v) => this.useProxyChanged(v));
            cg.get('proxyHost').setValue(this.config.proxyHost);
            cg.get('proxyPort').setValue(this.config.proxyPort);
            cg.get('bypassProxyRegex').setValue(this.config.bypassProxyRegex);
            this.useProxyChanged(this.config.useProxy);
        }

        if (this.seleniumConfig) {
            const cg = this.configForm.get('selenium');
            cg.get('port').setValue(this.seleniumConfig.port);
            cg.get('healthCheckInterval').setValue(this.seleniumConfig.healthCheckInterval);
            cg.get('seleniumTimeout').setValue(this.seleniumConfig.seleniumTimeout);
            cg.get('maxIdleTime').setValue(this.seleniumConfig.maxIdleTimeBetweenCommands);
        }

        this.updateSeleniumURL();
    }

    useProxyChanged(value: boolean) {
        const cg = this.configForm.get('basic');
        ['proxyHost', 'proxyPort', 'bypassProxyRegex'].forEach(p => (value ? cg.get(p).enable() : cg.get(p).disable()));
    }

    updateSeleniumURL() {
        this.clientSeleniumURL = 'http://' + this.configForm.get('basic').get('hostName').value
            + ':' + this.configForm.get('selenium').get('port').value + '/';
    }

    saveConfig(event: any) {
        this.alerts = [];

        let cg = this.configForm.get('basic');

        const config  = {
            hostName: cg.get('hostName').value,
            useProxy: cg.get('useProxy').value,
            proxyHost: cg.get('proxyHost').value,
            proxyPort: cg.get('proxyPort').value,
            bypassProxyRegex: cg.get('bypassProxyRegex').value
        };

        cg = this.configForm.get('selenium');
        const seleniumConfig: SeleniumConfig = {
            port: cg.get('port').value,
            healthCheckInterval: cg.get('healthCheckInterval').value,
            seleniumTimeout: cg.get('seleniumTimeout').value,
            maxIdleTimeBetweenCommands: cg.get('maxIdleTime').value
        };

        const successMsgBasic = {
            type: 'info',
            message: 'Basic configuration updated successfully.'
        };
        const successMsgSelenium = {
            type: 'info',
            message: 'Selenium configuration updated successfully.'
        };

        this.configService.setBasicConfiguration(config).subscribe(
            d => { this.alerts.push(successMsgBasic); this.updateSeleniumURL(); },
            e => this.showSaveError(BASIC_ERROR_PREFIX + e.error.error));
        this.configService.setSeleniumConfiguration(seleniumConfig).subscribe(
            d => { this.alerts.push(successMsgSelenium); this.updateSeleniumURL(); },
            e => this.showSaveError(SELENIUM_ERROR_PREFIX + e.error.error));
    }

    closeAlert(alert) {
        if (this.alerts.indexOf(alert) > -1) {
            this.alerts = this.alerts.filter(a => a !== alert);
        }
    }

    private showSaveError(msg?: any) {
        if (!msg) {
            msg = 'Error updating configuration: Could not save configuration.';
        }
        this.alerts.push({
            type: 'danger',
            message: msg
        });
    }
}
