moment().format("ddd, hA");
    moment.updateLocale('en', {
        relativeTime: {
            future: "in %s",
            past: "%s ago",
            s: 'seconds',
            ss: '%d seconds',
            m: "a minute",
            mm: "%d minutes",
            h: "an hour",
            hh: "%d hours",
            d: "a day",
            dd: "%d days",
            M: "a month",
            MM: "%d months",
            y: "a year",
            yy: "%d years"
        },
        calendar: {
            lastDay: '[YESTERDAY]',
            sameDay: 'HH:mm',
            nextDay: '[Tomorrow at] HH:mm',
            lastWeek: 'DD/MM/YY',
            nextWeek: 'dddd [at] HH:mm',
            sameElse: 'L'
        }
    });