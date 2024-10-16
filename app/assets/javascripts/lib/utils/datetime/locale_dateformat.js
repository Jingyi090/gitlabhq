import { createDateTimeFormat } from '~/locale';

/**
 * Format a Date with the help of {@link DateTimeFormat.asDateTime}
 *
 * Note: In case you can use localDateFormat.asDateTime directly, please do that.
 *
 * @example
 * localDateFormat[DATE_WITH_TIME_FORMAT].format(date) // returns 'Jul 6, 2020, 2:43 PM'
 * localDateFormat[DATE_WITH_TIME_FORMAT].formatRange(date, date) // returns 'Jul 6, 2020, 2:45PM – 8:43 PM'
 */
export const DATE_WITH_TIME_FORMAT = 'asDateTime';
/**
 * Format a Date with the help of {@link DateTimeFormat.asDate}
 *
 * Note: In case you can use localDateFormat.asDate directly, please do that.
 *
 * @example
 * localDateFormat[DATE_ONLY_FORMAT].format(date) // returns 'Jul 05, 2023'
 * localDateFormat[DATE_ONLY_FORMAT].formatRange(date, date) // returns 'Jul 05 - Jul 07, 2023'
 */
export const DATE_ONLY_FORMAT = 'asDate';
export const DEFAULT_DATE_TIME_FORMAT = DATE_WITH_TIME_FORMAT;
export const DATE_TIME_FORMATS = [DATE_WITH_TIME_FORMAT, DATE_ONLY_FORMAT];

/**
 * The DateTimeFormat utilities support formatting a number of types,
 * essentially anything you might use in the `Date` constructor.
 *
 * The reason for this is mostly backwards compatibility, as dateformat did the same
 * https://github.com/felixge/node-dateformat/blob/c53e475891130a1fecd3b0d9bc5ebf3820b31b44/src/dateformat.js#L37-L41
 *
 * @typedef {Date|number|string|null} Dateish
 *
 */
/**
 * @typedef {Object} DateTimeFormatter
 * @property {function(Dateish): string} format
 *   Formats a single {@link Dateish}
 *   with {@link Intl.DateTimeFormat.format}
 * @property {function(Dateish, Dateish): string} formatRange
 *   Formats two {@link Dateish} as a range
 *   with {@link Intl.DateTimeFormat.formatRange}
 */

class DateTimeFormat {
  #formatters = {};

  /**
   * Locale aware formatter to display date _and_ time.
   *
   * Use this formatter when in doubt.
   *
   * @example
   * // en-US: returns something like Jul 6, 2020, 2:43 PM
   * // en-GB: returns something like 6 Jul 2020, 14:43
   * localDateFormat.asDateTime.format(date)
   *
   * @returns {DateTimeFormatter}
   */
  get asDateTime() {
    return (
      this.#formatters[DATE_WITH_TIME_FORMAT] ||
      this.#createFormatter(DATE_WITH_TIME_FORMAT, {
        dateStyle: 'medium',
        timeStyle: 'short',
        hourCycle: DateTimeFormat.#hourCycle,
      })
    );
  }

  /**
   * Locale aware formatter to display a only the date.
   *
   * Use {@link DateTimeFormat.asDateTime} if you also need to display the time.
   *
   * @example
   * // en-US: returns something like Jul 6, 2020
   * // en-GB: returns something like 6 Jul 2020
   * localDateFormat.asDate.format(date)
   *
   * @example
   * // en-US: returns something like Jul 6 – 7, 2020
   * // en-GB: returns something like 6-7 Jul 2020
   * localDateFormat.asDate.formatRange(date, date2)
   *
   * @returns {DateTimeFormatter}
   */
  get asDate() {
    return (
      this.#formatters[DATE_ONLY_FORMAT] ||
      this.#createFormatter(DATE_ONLY_FORMAT, {
        dateStyle: 'medium',
      })
    );
  }

  /**
   * Resets the memoized formatters
   *
   * While this method only seems to be useful for testing right now,
   * it could also be used in the future to live-preview the formatting
   * to the user on their settings page.
   */
  reset() {
    this.#formatters = {};
  }

  /**
   * This helper function creates formatters in a memoized fashion.
   *
   * The first time a getter is called, it will use this helper
   * to create an {@link Intl.DateTimeFormat} which is used internally.
   *
   * We memoize the creation of the formatter, because using one of them
   * is about 300 faster than creating them.
   *
   * @param {string} name (one of {@link DATE_TIME_FORMATS})
   * @param {Intl.DateTimeFormatOptions} format
   * @returns {DateTimeFormatter}
   */
  #createFormatter(name, format) {
    const intlFormatter = createDateTimeFormat(format);

    this.#formatters[name] = {
      format: (date) => intlFormatter.format(DateTimeFormat.castToDate(date)),
      formatRange: (date1, date2) => {
        return intlFormatter.formatRange(
          DateTimeFormat.castToDate(date1),
          DateTimeFormat.castToDate(date2),
        );
      },
    };

    return this.#formatters[name];
  }

  /**
   * Casts a Dateish to a Date.
   * @param dateish {Dateish}
   * @returns {Date}
   */
  static castToDate(dateish) {
    const date = dateish instanceof Date ? dateish : new Date(dateish);
    if (Number.isNaN(date)) {
      // eslint-disable-next-line @gitlab/require-i18n-strings
      throw new Error('Invalid date provided');
    }
    return date;
  }

  /**
   * Internal method to determine the {@link Intl.Locale.hourCycle} a user prefers.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Locale/hourCycle
   * @returns {undefined|'h12'|'h23'}
   */
  static get #hourCycle() {
    switch (window.gon?.time_display_format) {
      case 1:
        return 'h12';
      case 2:
        return 'h23';
      default:
        return undefined;
    }
  }
}

/**
 * A singleton instance of {@link DateTimeFormat}.
 * This formatting helper respects the user preferences (locale and 12h/24h preference)
 * and gives an efficient way to format dates and times.
 *
 * Each of the supported formatters has support to format a simple date, but also a range.
 *
 *
 * DateTime (showing both date and times):
 * - {@link DateTimeFormat.asDateTime localeDateFormat.asDateTime} - the default format for date times
 *
 * Date (showing date only):
 * - {@link DateTimeFormat.asDate localeDateFormat.asDate} - the default format for a date
 */
export const localeDateFormat = new DateTimeFormat();
