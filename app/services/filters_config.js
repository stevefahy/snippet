var filter_array = [{
        filter_css_name: 'filter-original',
        filter_name: 'original',
        blend: 'none'
    },
    {
        filter_css_name: 'filter-1977',
        filter_name: '1977',
        filter: 'sepia(.5) hue-rotate(-30deg) saturate(1.4)',
        blend: 'none'
    },
    {
        filter_css_name: 'filter-aden',
        filter_name: 'aden',
        gradient: 'solid',
        gradient_stops: [
            [125, 105, 24, 0.1]
        ],
        filter: 'sepia(.2) brightness(1.15) saturate(1.4)',
        blend: 'multiply'
    },
    {
        filter_css_name: 'filter-amaro',
        filter_name: 'amaro',
        gradient: 'solid',
        gradient_stops: [
            [125, 105, 24, 0.2]
        ],
        filter: 'sepia(.35) contrast(1.1) brightness(1.2) saturate(1.3)',
        blend: 'overlay'

    },
    {
        filter_css_name: 'filter-ashby',
        filter_name: 'ashby',
        gradient: 'solid',
        gradient_stops: [
            [125, 105, 24, 0.35]
        ],
        filter: 'sepia(.5) contrast(1.2) saturate(1.8)',
        blend: 'lighten'
    },
    {
        filter_css_name: 'filter-brannan',
        filter_name: 'brannan',
        filter: 'sepia(.4) contrast(1.25) brightness(1.1) saturate(.9) hue-rotate(-2deg)',
        blend: 'none'
    },
    {
        filter_css_name: 'filter-brooklyn',
        filter_name: 'brooklyn',
        gradient: 'solid',
        gradient_stops: [
            [127, 187, 227, 0.2]
        ],
        filter: 'sepia(.25) contrast(1.25) brightness(1.25) hue-rotate(5deg)',
        blend: 'overlay'
    },
    {
        filter_css_name: 'filter-charmes',
        filter_name: 'charmes',
        gradient: 'solid',
        gradient_stops: [
            [125, 105, 24, 0.25]
        ],
        filter: 'sepia(.25) contrast(1.25) brightness(1.25) saturate(1.35) hue-rotate(-5deg)',
        blend: 'darken'
    },
    {
        filter_css_name: 'filter-clarendon',
        filter_name: 'clarendon',
        gradient: 'solid',
        gradient_stops: [
            [127, 187, 227, 0.4]
        ],
        filter: 'sepia(.15) contrast(1.25) brightness(1.25) hue-rotate(5deg)',
        blend: 'overlay'
    },
    {
        filter_css_name: 'filter-crema',
        filter_name: 'crema',
        gradient: 'solid',
        gradient_stops: [
            [125, 105, 24, 0.2]
        ],
        filter: 'sepia(.5) contrast(1.25) brightness(1.15) saturate(.9) hue-rotate(-2deg)',
        blend: 'multiply'
    },
    {
        filter_css_name: 'filter-dogpatch',
        filter_name: 'dogpatch',
        gradient: 'none',
        gradient_stops: [
            []
        ],
        filter: 'sepia(.35) saturate(1.1) contrast(1.5)',
        blend: 'none'
    },
    {
        filter_css_name: 'filter-earlybird',
        filter_name: 'earlybird',
        gradient: 'radial',
        gradient_stops: [
            [0, 125, 105, 24, 0],
            [1, 125, 105, 24, 0.3]
        ],
        filter: 'sepia(.25) contrast(1.25) brightness(1.15) saturate(.9) hue-rotate(-5deg)',
        blend: 'multiply'
    },
    {
        filter_css_name: 'filter-gingham',
        filter_name: 'gingham',
        gradient: 'solid',
        gradient_stops: [
            [230, 230, 230, 1]
        ],
        filter: 'contrast(1.1) brightness(1.1)',
        blend: 'soft-light'
    },
    {
        filter_css_name: 'filter-ginza',
        filter_name: 'ginza',
        gradient: 'solid',
        gradient_stops: [
            [125, 105, 24, 0.15]
        ],
        filter: 'sepia(.25) contrast(1.15) brightness(1.2) saturate(1.35) hue-rotate(-5deg)',
        blend: 'darken'
    },
    {
        filter_css_name: 'filter-hefe',
        filter_name: 'hefe',
        gradient: 'radial',
        gradient_stops: [
            [0, 0, 0, 0, 0],
            [1, 0, 0, 0, 0.25]
        ],
        filter: 'sepia(.4) contrast(1.5) brightness(1.2) saturate(1.4) hue-rotate(-10deg)',
        blend: 'multiply'
    },
    {
        filter_css_name: 'filter-helena',
        filter_name: 'helena',
        gradient: 'solid',
        gradient_stops: [
            [158, 175, 30, 0.25]
        ],
        filter: 'sepia(.5) contrast(1.05) brightness(1.05) saturate(1.35)',
        blend: 'overlay'
    },
    {
        filter_css_name: 'filter-hudson',
        filter_name: 'hudson',
        gradient: 'radial',
        gradient_stops: [
            [0, 25, 62, 167, 0],
            [1, 25, 62, 167, 0.25]
        ],
        filter: 'sepia(.25) contrast(1.2) brightness(1.2) saturate(1.05) hue-rotate(-15deg)',
        blend: 'multiply'
    },
    {
        filter_css_name: 'filter-inkwell',
        filter_name: 'inkwell',
        filter: 'brightness(1.25) contrast(.85) grayscale(1)',
        blend: 'none'
    },
    {
        filter_css_name: 'filter-juno',
        filter_name: 'juno',
        gradient: 'solid',
        gradient_stops: [
            [127, 187, 227, 0.2]
        ],
        filter: 'sepia(.35) contrast(1.15) brightness(1.15) saturate(1.8)',
        blend: 'overlay'
    },
    {
        filter_css_name: 'filter-kelvin',
        filter_name: 'kelvin',
        gradient: 'radial',
        gradient_stops: [
            [0, 128, 78, 15, 0.25],
            [1, 128, 78, 15, 0.50]
        ],
        filter: 'sepia(0.15) contrast(1.5) brightness(1.1) hue-rotate(-10deg)',
        blend: 'overlay'
    },
    {
        filter_css_name: 'filter-lark',
        filter_name: 'lark',
        filter: 'sepia(.25) contrast(1.2) brightness(1.3) saturate(1.25)',
        blend: 'none'
    },
    {
        filter_css_name: 'filter-lofi',
        filter_name: 'lofi',
        filter: 'saturate(1.1) contrast(1.5)',
        blend: 'none'
    },
    {
        filter_css_name: 'filter-ludwig',
        filter_name: 'ludwig',
        gradient: 'solid',
        gradient_stops: [
            [125, 105, 24, 0.1]
        ],
        filter: 'sepia(.25) contrast(1.05) brightness(1.05) saturate(2)',
        blend: 'overlay'
    },
    {
        filter_css_name: 'filter-maven',
        filter_name: 'maven',
        gradient: 'solid',
        gradient_stops: [
            [158, 175, 30, 0.25]
        ],
        filter: 'sepia(.35) contrast(1.05) brightness(1.05) saturate(1.75)',
        blend: 'darken'
    },
    {
        filter_css_name: 'filter-mayfair',
        filter_name: 'mayfair',
        gradient: 'radial',
        gradient_stops: [
            [0, 175, 105, 24, 0],
            [1, 175, 105, 24, 0.5]
        ],
        filter: 'contrast(1.1) brightness(1.15) saturate(1.1)',
        blend: 'multiply'
    },
    {
        filter_css_name: 'filter-moon',
        filter_name: 'moon',
        filter: 'brightness(1.4) contrast(.95) saturate(0) sepia(.35)',
        blend: 'none'
    },
    {
        filter_css_name: 'filter-nashville',
        filter_name: 'nashville',
        gradient: 'radial',
        gradient_stops: [
            [0, 128, 78, 15, 0.5],
            [1, 128, 78, 15, 0.65]
        ],
        filter: 'sepia(.25) contrast(1.5) brightness(.9) hue-rotate(-15deg)',
        blend: 'screen'
    },
    {
        filter_css_name: 'filter-perpetua',
        filter_name: 'perpetua',
        gradient: 'linear',
        gradient_stops: [
            [0, 0, 91, 154, 0.25],
            [1, 230, 193, 61, 0.25]
        ],
        filter: 'contrast(1.1) brightness(1.25) saturate(1.1)',
        blend: 'multiply'
    },
    {
        filter_css_name: 'filter-poprocket',
        filter_name: 'poprocket',
        gradient: 'radial',
        gradient_percent: [0, 40, 80, 100],
        gradient_stops: [
            [0, 206, 39, 70, 0.75],
            [0.4, 206, 39, 70, 0.75],
            [0.8, 0, 0, 0, 1],
            [1, 0, 0, 0, 1]
        ],
        filter: 'sepia(.15) brightness(1.2)',
        blend: 'screen'
    },
    {
        filter_css_name: 'filter-reyes',
        filter_name: 'reyes',
        filter: 'sepia(.75) contrast(.75) brightness(1.25) saturate(1.4)',
        blend: 'none'
    },
    {
        filter_css_name: 'filter-rise',
        filter_name: 'rise',
        gradient: 'radial',
        gradient_stops: [
            [0, 230, 193, 61, 0.25],
            [1, 230, 193, 61, 0.25]
        ],
        filter: 'sepia(.25) contrast(1.25) brightness(1.2) saturate(.9)',
        blend: 'lighten'
    },
    {
        filter_css_name: 'filter-sierra',
        filter_name: 'sierra',
        gradient: 'radial',
        gradient_stops: [
            [1, 128, 78, 15, 0.5],
            [0, 0, 0, 0, 0.65]
        ],
        filter: 'sepia(.25) contrast(1.5) brightness(.9) hue-rotate(-15deg)',
        blend: 'screen'
    },
    {
        filter_css_name: 'filter-skyline',
        filter_name: 'skyline',
        filter: 'sepia(.15) contrast(1.25) brightness(1.25) saturate(1.2)',
        blend: 'none'
    },
    {
        filter_css_name: 'filter-slumber',
        filter_name: 'slumber',
        gradient: 'solid',
        gradient_stops: [
            [125, 105, 24, 0.2]
        ],
        filter: 'sepia(.35) contrast(1.25) saturate(1.25)',
        blend: 'darken'
    },
    {
        filter_css_name: 'filter-stinson',
        filter_name: 'stinson',
        gradient: 'solid',
        gradient_stops: [
            [125, 105, 24, 0.45]
        ],
        filter: 'sepia(.35) contrast(1.25) brightness(1.1) saturate(1.25)',
        blend: 'lighten'
    },
    {
        filter_css_name: 'filter-sutro',
        filter_name: 'sutro',
        gradient: 'radial',
        gradient_percent: [0, 50, 90, 100],
        gradient_stops: [
            [0, 0, 0, 0, 0],
            [0.5, 0, 0, 0, 0],
            [0.7, 0, 0, 0, 0.5],
            [1, 0, 0, 0, 0.5]
        ],
        filter: 'sepia(.4) contrast(1.2) brightness(.9) saturate(1.4) hue-rotate(-10deg)',
        blend: 'darken'
    },
    {
        filter_css_name: 'filter-toaster',
        filter_name: 'toaster',
        gradient: 'radial',
        gradient_stops: [
            [0, 128, 78, 15, 1],
            [1, 0, 0, 0, 0.25]
        ],
        filter: 'sepia(.25) contrast(1.5) brightness(.95) hue-rotate(-15deg)',
        blend: 'screen'
    },
    {
        filter_css_name: 'filter-valencia',
        filter_name: 'valencia',
        gradient: 'solid',
        gradient_stops: [
            [230, 193, 61, 0.1]
        ],
        filter: 'sepia(.25) contrast(1.1) brightness(1.1)',
        blend: 'lighten'
    },
    {
        filter_css_name: 'filter-vesper',
        filter_name: 'vesper',
        gradient: 'solid',
        gradient_stops: [
            [125, 105, 24, 0.25]
        ],
        filter: 'sepia(.35) contrast(1.15) brightness(1.2) saturate(1.3)',
        blend: 'overlay'
    },
    {
        filter_css_name: 'filter-walden',
        filter_name: 'walden',
        gradient: 'solid',
        gradient_stops: [
            [229, 240, 128, 0.5]
        ],
        filter: 'sepia(.35) contrast(.8) brightness(1.25) saturate(1.4)',
        blend: 'darken'
    },
    {
        filter_css_name: 'filter-willow',
        filter_name: 'willow',
        filter: 'brightness(1.2) contrast(.85) saturate(.05) sepia(.2)',
        blend: 'none'
    },
    {
        filter_css_name: 'filter-xpro-ii',
        filter_name: 'xpro-ii',
        gradient: 'radial',
        gradient_stops: [
            [0, 0, 91, 154, 0.35],
            [1, 0, 0, 0, 0.65]
        ],
        filter: 'sepia(.45) contrast(1.25) brightness(1.75) saturate(1.3) hue-rotate(-5deg)',
        blend: 'multiply'
    }
];