
const SVG_NS = 'http://www.w3.org/2000/svg';

const GaugeDefaults = {
    centerX: 50,
    centerY: 50
};

const defaultOptions: GaugeOptions = {
    dialRadius: 40,
    dialStartAngle: 135,
    dialEndAngle: 45,
    value: 0,
    max: 100,
    min: 0,
    valueDialClass: 'value',
    valueClass: 'value-text',
    dialClass: 'dial',
    gaugeClass: 'gauge',
    showValue: true,
    color: null,
    label: (value) => String(Math.round(value))
};

export interface GaugeOptions {
    /**
     * The angle in degrees to start the dial
     */
    dialStartAngle?: number;

    /**
     * The angle in degrees to end the dial. This MUST be less than dialStartAngle
     */
    dialEndAngle?: number;

    /**
     * The radius of the gauge
     */
    dialRadius?: number;

    /**
     * The minumum value for the gauge
     */
    min?: number;

    /**
     * The maximum value for the gauge
     */
    max?: number;

    /**
     * Function that returns a string label that will be rendered in the center. This function will be passed the current value
     */
    label?: (value: number) => string;

    /**
     * Function that returns a string color value for the gauge''s fill (value dial)
     */
    color?: (value: number) => string;

    /**
     * Whether to show the value at the center of the gauge
     */
    showValue?: boolean;

    /**
     * The CSS class of the gauge
     */
    gaugeClass?: string;

    /**
     * The CSS class of the gauge's dial
     */
    dialClass?: string;

    /**
     * The CSS class of the gauge's fill (value dial)
     */
    valueDialClass?: string;

    /**
     * 	The CSS class of the gauge's label text
     */
    valueLabelClass?: string;

    /**
     * 	The CSS class of the gauge's text
     */
    valueClass?: string;

    /**
     * The value of the gauge
     */
    value?: number;

    /**
     * Whether to animate changing the gauge
     */
    animated?: boolean;

    /**
     * Animation duration in seconds
     */
    animationDuration?: number;
}

export interface Coord {
    x: number;
    y: number;
}

export class Gauge {

    private requestAnimationFrame: (callback: () => any) => void;

    private gaugeValueElem: Element;

    private gaugeValuePath: Element;

    private opts: GaugeOptions;

    // attributes which can be changed after creation
    private value: number;

    private min: number;

    private max: number;

    constructor(elem: Element, opts: GaugeOptions) {
        this.requestAnimationFrame = (window.requestAnimationFrame ||
            window['mozRequestAnimationFrame'] ||
            window.webkitRequestAnimationFrame ||
            window['msRequestAnimationFrame'] ||
            function (cb) {
                return setTimeout(cb, 1000 / 60);
            });
        this.opts = opts;
        this.initializeGauge(elem);
    }

    public setMaxValue(max: number): void {
        this.max = max;
        this.updateGauge(this.value);
    }

    public setValue(val: number): void {
        this.value = this.normalize(val, this.min, this.max);
        if (this.opts.color) {
            this.setGaugeColor(this.value, 0);
        }
        this.updateGauge(this.value);
    }

    public setValueAnimated(val, duration): void {
        const oldVal = this.value;
        this.value = this.normalize(val, this.min, this.max);
        if (oldVal === this.value) {
            return;
        }

        if (this.opts.color) {
            this.setGaugeColor(this.value, duration);
        }

        this.Animation({
          start: oldVal || 0,
          end: this.value,
          duration: duration || 1,
          step: (v, frame) => this.updateGauge(v)
        });
    }

    public getValue(): number {
        return this.value;
    }

    public getOptions(): GaugeOptions {
        // clone to avoid modifications
        return { ...this.opts };
    }


    private initializeGauge(_elem: Element): void {
        // TODO normalize options (set defaults, where applicable)
        const fullOpts = {
            ...defaultOptions,
            ...this.opts
        };

        this.opts = fullOpts;
        this.min = this.opts.min;
        this.max = this.opts.max;

        if (this.opts.dialStartAngle < this.opts.dialEndAngle) {
            console.log('WARN! Gauge startAngle < endAngle, Swapping');
            const tmp = this.opts.dialStartAngle;
            this.opts.dialStartAngle = this.opts.dialEndAngle;
            this.opts.dialEndAngle = tmp;
        }

        this.gaugeValueElem = this.svg('text', {
            x: 50,
            y: 50,
            fill: '#999',
            class: this.opts.valueClass,
            'font-size': '100%',
            'font-family': 'sans-serif',
            'font-weight': 'normal',
            'text-anchor': 'middle',
            'alignment-baseline': 'middle'
        });

        this.gaugeValuePath = this.svg('path', {
            class: this.opts.valueDialClass,
            fill: 'none',
            stroke: '#666',
            'stroke-width': 2.5,
            d: this.pathString(this.opts.dialRadius, this.opts.dialStartAngle, this.opts.dialStartAngle) // value of 0
        });

        const angle = this.getAngle(100, 360 - Math.abs(this.opts.dialStartAngle - this.opts.dialEndAngle));
        const flag = angle <= 180 ? 0 : 1;
        const gaugeElement = this.svg('svg', { 'viewBox': '0 0 100 100', class: this.opts.gaugeClass },
            [
                this.svg('path', {
                    class: this.opts.dialClass,
                    fill: 'none',
                    stroke: '#eee',
                    'stroke-width': 2,
                    d: this.pathString(this.opts.dialRadius, this.opts.dialStartAngle, this.opts.dialEndAngle, flag)
                }),
                this.gaugeValueElem,
                this.gaugeValuePath
            ]
        );
        _elem.appendChild(gaugeElement);
    }

    private updateGauge(theValue: number): void {
        const val = this.getValueInPercentage(theValue, this.min, this.max),
            angle = this.getAngle(val, 360 - Math.abs(this.opts.dialStartAngle - this.opts.dialEndAngle)),
            // this is because we are using arc greater than 180deg
            flag = angle <= 180 ? 0 : 1;
        if (this.opts.showValue) {
            this.gaugeValueElem.textContent = this.opts.label.call(this.opts, theValue);
        }
        this.gaugeValuePath.setAttribute('d', this.pathString(this.opts.dialRadius, this.opts.dialStartAngle,
            angle + this.opts.dialStartAngle, flag));
    }

    private setGaugeColor(_value: number, duration: number): void {
        const c = this.opts.color.call(this.opts, _value),
            dur = duration * 1000,
            pathTransition = 'stroke ' + dur + 'ms ease';

        this.gaugeValuePath.setAttribute('style', [
            'stroke: ' + c,
            '-webkit-transition: ' + pathTransition,
            '-moz-transition: ' + pathTransition,
            'transition: ' + pathTransition,
        ].join(';'));
    }

    /**
     * A utility function to create SVG dom tree
     * @param {String} name The SVG element name
     * @param {Object} attrs The attributes as they appear in DOM e.g. stroke-width and not strokeWidth
     * @param {Array} children An array of children (can be created by this same function)
     * @return The SVG element
     */
    private svg(name: string, attrs: any, children?: Array<any>): Element {
        const elem = document.createElementNS(SVG_NS, name);
        Object.keys(attrs).forEach(k => elem.setAttribute(k, attrs[k]));

        if (children) {
            children.forEach(function (c) {
                elem.appendChild(c);
            });
        }

        return elem;
    }

    /**
     * Translates percentage value to angle. e.g. If gauge span angle is 180deg, then 50%
     * will be 90deg
     */
    private getAngle(percentage: number, gaugeSpanAngle: number): number {
        return percentage * gaugeSpanAngle / 100;
    }

    private normalize(value: number, min: number, limit: number): number {
        if (value > limit) { return limit; }
        if (value < min) { return min; }
        return value;
    }

    private getValueInPercentage(value: number, min: number, max: number): number {
        const newMax = max - min, newVal = value - min;
        return 100 * newVal / newMax;
    }

    /**
     * Gets cartesian co-ordinates for a specified radius and angle (in degrees)
     * @param cx {Number} The center x co-oriinate
     * @param cy {Number} The center y co-ordinate
     * @param radius {Number} The radius of the circle
     * @param angle {Number} The angle in degrees
     * @return An object with x,y co-ordinates
     */
    private getCartesian(cx: number, cy: number, radius: number, angle: number): Coord {
        const rad = angle * Math.PI / 180;
        return {
            x: Math.round((cx + radius * Math.cos(rad)) * 1000) / 1000,
            y: Math.round((cy + radius * Math.sin(rad)) * 1000) / 1000
        };
    }

    // Returns start and end points for dial
    // i.e. starts at 135deg ends at 45deg with large arc flag
    // REMEMBER!! angle=0 starts on X axis and then increases clockwise
    private getDialCoords(radius: number, startAngle: number, endAngle: number): { end: Coord, start: Coord } {
        const cx = GaugeDefaults.centerX, cy = GaugeDefaults.centerY;
        return {
            end: this.getCartesian(cx, cy, radius, endAngle),
            start: this.getCartesian(cx, cy, radius, startAngle)
        };
    }

    private pathString(_radius: number, _startAngle: number, _endAngle: number, _largeArc?: number): string {
        const coords = this.getDialCoords(_radius, _startAngle, _endAngle),
            start = coords.start,
            end = coords.end,
            largeArcFlag = typeof (_largeArc) === 'undefined' ? 1 : _largeArc;

        return [
            'M', start.x, start.y,
            'A', _radius, _radius, 0, largeArcFlag, 1, end.x, end.y
        ].join(' ');
    }


    /**
     * Simplistic animation function for animating the gauge. That's all!
     * Options are:
     * {
     *  duration: 1,    // In seconds
     *  start: 0,       // The start value
     *  end: 100,       // The end value
     *  step: function, // REQUIRED! The step function that will be passed the value and does something
     *  easing: function // The easing function. Default is easeInOutCubic
     * }
     */
    private Animation(options): void {
        const duration = options.duration,
            iterations = 60 * duration,
            start = options.start || 0,
            end = options.end,
            change = end - start,
            step = options.step,
            easing = options.easing || function easeInOutCubic(pos) {
                // https://github.com/danro/easing-js/blob/master/easing.js
                if ((pos /= 0.5) < 1) {
                    return 0.5 * Math.pow(pos, 3);
                }
                return 0.5 * (Math.pow((pos - 2), 3) + 2);
            };
        let currentIteration = 1;

        function animate() {
            const progress = currentIteration / iterations,
                value = change * easing(progress) + start;
            // console.log(progress + ", " + value);
            step(value, currentIteration);
            currentIteration += 1;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }
        // start!
        requestAnimationFrame(animate);
    }

}
