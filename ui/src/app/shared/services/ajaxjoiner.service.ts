import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { HttpErrorResponse } from '@angular/common/http';

export interface AjaxJoiner {

    successHandler: () => void;

    errorHandler: (e: HttpErrorResponse, key?: any) => void;

    observables: Array<Observable<any>>;

    addObservable<T>(observable: Observable<T>, dataHandler: (T) => void, key?: any): void;

}

@Injectable()
export class AjaxJoinerService {

    public createAjaxJoiner(successHandler: () => void, errorHandler: (e: HttpErrorResponse, key?: any) => void): AjaxJoiner {
        const joiner = {
            successHandler: successHandler,
            errorHandler: errorHandler,
            observables: [],

            addObservable: <T>(observable: Observable<T>, dataHandler: (T) => void, key?: any) => {
                joiner.observables.push(observable);
                observable.subscribe(data => {
                    joiner.observables.splice(joiner.observables.indexOf(observable), 1);
                    dataHandler(data);
                    if (joiner.observables.length === 0) {
                        successHandler();
                    }
                }, error => {
                    errorHandler(error, key);
                });
            }
        };

        return joiner;
    }
}
