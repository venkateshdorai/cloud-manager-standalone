import { GaugeOptions } from './gauge.native';

export class GaugeDefaults implements GaugeOptions {
  /**
   * The angle in degrees to start the dial
   */
  dialStartAngle = 135;

  /**
   * The angle in degrees to end the dial. This MUST be less than dialStartAngle
   */
  dialEndAngle = 45;

  /**
   * The radius of the gauge
   */
  dialRadius = 40;

  /**
   * The minimum value for the gauge
   */
  min = 0;

  /**
   * The maximum value for the gauge
   */
  max = 100;

  /**
   * Function that returns a string label that will be rendered in the center. This function will be passed the current value
   */
  label: (value: number) => string;

  /**
   * Function that returns a string color value for the gauge''s fill (value dial)
   */
  color: (value: number) => string;

  /**
   * Whether to show the value at the center of the gauge
   */
  showValue = true;

  /**
   * The CSS class of the gauge
   */
  gaugeClass = 'gauge';

  /**
   * The CSS class of the gauge's dial
   */
  dialClass = 'dial';

  /**
   * The CSS class of the gauge's fill (value dial)
   */
  valueDialClass = 'value';

  /**
   * 	The CSS class of the gauge's text
   */
  valueClass = 'value-text';

  /**
   * The value of the gauge
   */
  value: number;

  /**
   * Whether to animate changing the gauge
   */
  animated = false;

  /**
   * Animation duration in seconds
   */
  animationDuration: number;
}
