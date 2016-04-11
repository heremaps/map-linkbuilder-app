/** @namespace */
var here = window.here || {};

here.builder = here.builder || {};

/**
 * List of supported map types
 * @default 'normal'
 * @type {array}
 */
var mapTypes = [
    {label: 'Street (default)', value: 'normal', default: true},
    {label: 'Terrain', value: 'terrain'},
    {label: 'Satellite', value: "satellite"},
    {label: 'Street with public transport overlay', value: "pt"},
    {label: 'Street with traffic info overlay', value: "traffic"},
    {label: 'Satellite with street overlay', value: "hybrid"}
];

/**
 * List of supported transport modes
 * @default 'Drive'
 * @type {array}
 */
var transportModes = [
    {label: 'Drive', value: 'd', default: true},
    {label: 'Public transport', value: 'pt'},
    {label: 'Walk', value: "w"}
];

/**
 * Bounding box
 * https://developer.here.com/rest-apis/documentation/places/topics/location-contexts.html
 * @type {number[]} - west longitude, south latitude, east longitude, north latitude
 */
var viewport = [-167.4317, -56.2974, -168.7692, 74.4081];

/**
 * LocationBox object represents a DOM input element.
 * The user can search for location/place typing in the LocationBox.
 * @param {string} placeholder
 * @constructor
 */
here.builder.LocationBox = function (placeholder) {
    here.utils.DomView.call(this);
    this.addClass('location-box');

    this.ready = false;

    this._input = document.createElement('input');
    this._input.type = 'text';
    if (placeholder) {
        this._input.setAttribute('placeholder', placeholder);
    }

    this._input.addEventListener('input', this._onInput.bind(this));

    this.append(this._input);

    // Auto complete
    // https://leaverou.github.io/awesomplete/
    this._comp = new window.Awesomplete(this._input, {
        minChars: 0,
        // Don't filter
        filter: function () {
            return true;
        }
    });
    this._input.addEventListener("awesomplete-selectcomplete", this._onSelect.bind(this));

    // Mouse event of the auto completer triggers a click on the body, overwriting the auto focus implementation.
    // Stopping the event right away.
    this._comp.ul.addEventListener("mousedown", function (e) {
        e.preventDefault();
    });

    this._debouncedRequest = here.utils.debounce(this._sendRequest.bind(this), 300);
};

/**
 * @type {here.builder.LocationBox}
 * @extends DomView
 */
here.builder.LocationBox.prototype = new here.utils.DomView();

// Attaches specific event handlers to the LocationBox element
here.utils.extend(here.builder.LocationBox.prototype, {
    /**
     * Sends a place search request
     * @param {object} e
     * @private
     */
    _onInput: function (e) {
        this._clear();
        var query = e.target.value;
        if (query.length > 2) {
            this._debouncedRequest(query);
        }
    },

    /**
     * Selects a result from the results list
     * @private
     */
    _onSelect: function () {
        var i = this._list.indexOf(this._input.value);
        this._result = this._results[i];
        this._afterSelect();
    },

    /**
     * Sets the input state to ready
     * Triggers a here-locationbox-change event
     * @private
     */
    _afterSelect: function () {
        this._setReady(true);
        this._trigger('here-locationbox-change');
    },

    /**
     * Sends a search request to HERE Places API
     * https://developer.here.com/rest-apis/documentation/places/topics_api/resource-search.html
     * @param {string} query - plain-text search term. For example, "restaurant" or "Brandenburger Tor"
     * @private
     */
    _sendRequest: function (query) {
        var baseURL = here.builder.config.PBAPI +
            'discover/search?' +
            'app_id=' + here.builder.config.appId +
            '&app_code=' + here.builder.config.appCode +
            '&X-Map-Viewport=' + viewport.join() +
            '&X-NOSE-nokiamaps-lookahead=1' +
            '&q=';

        here.utils.request(
            baseURL + query,
            this._handleRequest.bind(this));
    },

    /**
     * Transforms the place search response and initializes the _results,_list and _comp fields
     * @param {array} response
     * @private
     */
    _handleRequest: function (response) {
        var results = response.results.items;
        var result;
        var list = [];
        for (var i = 0, l = results.length; i < l; i++) {
            result = results[i];
            list.push(result.title + ', ' + result.vicinity.replace(/<br\/>/g, ', '));
        }
        this._results = results;
        this._list = list;
        this._comp.list = list;
    },

    /**
     * Sets the element ready state to false
     * Clears the element and triggers a 'here-locationbox-change' event
     * @private
     */
    _clear: function () {
        this._setReady(false);
        this._result = null;
        this._trigger('here-locationbox-change');
    },

    /**
     * Creates a URL segment consisting of the place coordinates and place name
     * @returns {string}
     */
    getSegment: function () {
        if (this.ready && this._result) {
            var segment = this._result.position[0] + ',' +
                this._result.position[1] + ',' +
                encodeURIComponent(this._input.value);
            return segment;
        }
    },

    /**
     * Sets the ready state of the element
     * @param {boolean} ready
     * @private
     */
    _setReady: function (ready) {
        if (ready) {
            this.ready = true;
            this._trigger('here-locationbox-ready');
        }
        else {
            this.ready = false;
        }
    },

    /**
     * Returns the element
     * @returns {Element|*}
     */
    getInput: function () {
        return this._input;
    },

    /**
     * Resets the LocationBox
     */
    reset: function () {
        this._input.value = '';
        this._clear();
    }
});


/**
 * LocationBoxWithMyLocation object represents a LocationBox with myLocation capabilities
 * @constructor
 */
here.builder.LocationBoxWithMyLocation = function () {

    here.builder.LocationBox.apply(this, arguments);

    this._MYLOCATION_TEXT = "Use user's location";
    this.myLocation = false;
    this._canHaveMyLocation = true;

    this._input.addEventListener('focus', this._onFocus.bind(this));
    this._input.addEventListener("awesomplete-select", this._onBeforeSelect.bind(this));
};

/**
 * @type {here.builder.LocationBoxWithMyLocation}
 * @extends LocationBox
 */
here.builder.LocationBoxWithMyLocation.prototype = new here.builder.LocationBox();


// Attaches additional functionality to the LocationBoxWithMyLocation element
here.utils.extend(here.builder.LocationBoxWithMyLocation.prototype, {
    /**
     * Shows MyLocation option in a drop-down menu
     * @private
     */
    _showMyLocationOption: function () {
        this._comp.list = [this._MYLOCATION_TEXT];
    },

    /**
     * Calls the LocationBox onInput method and displays results from the place search request
     * @param {object} e
     * @private
     */
    _onInput: function (e) {
        here.builder.LocationBox.prototype._onInput.call(this, e);
        var query = e.target.value;
        if (query.length === 0 && this._canHaveMyLocation) {
            this._showMyLocationOption();
        }
    },

    /**
     * Clears the element and resets the myLocation option
     * @private
     */
    _clear: function () {
        here.builder.LocationBox.prototype._clear.call(this);
        if (this.myLocation) {
            this.myLocation = false;
            this._comp.list = [];
            this._trigger('here-mylocation-change', {instance: this});
        }
    },

    /**
     * Reacts on focus
     * Shows myLocation option if:
     *  - it's not shown yet AND
     *  - if the field can have a myLocation AND
     *  - if the element is empty
     * Shows the results from the place search request if:
     * - the element has some text AND
     * - the element is in ready state AND
     * - there are some results from the place request
     * @private
     */
    _onFocus: function () {
        this._input.select();
        if (!this.myLocation && this._canHaveMyLocation && this._input.value.length === 0) {
            this._showMyLocationOption();
        }

        if (this._input.value.length > 0 && !this.ready && this._comp._list.length > 0) {
            this._comp.open();
        }
    },

    /**
     * Prepares the element beforeSelect
     * @param {object} e
     */
    _onBeforeSelect: function (e) {
        if (e.text === this._MYLOCATION_TEXT) {
            e.preventDefault();
            this._input.value = "User's location";
            this._comp.list = [];
            this.myLocation = true;
            this._trigger('here-mylocation-change', {instance: this});
            this._setReady(true);
            this._trigger('here-locationbox-change');
        }
    },

    /**
     * Gets the URL segment string consisting of the place coordinates and place name.
     * If user chooses "Use user's location", the segment will be mylocation.
     * @returns {string}
     * @private
     */
    getSegment: function () {
        if (this.myLocation) {
            return 'mylocation';
        }
        else {
            return here.builder.LocationBox.prototype.getSegment.call(this);
        }
    },

    /**
     * Only one of the itinerary input fields can have mylocation selected.
     * If mylocation is selected already, mylocation can not be selected again.
     * @param {object} instance - the LocationBoxWithMyLocation instance
     */
    toggle: function (instance) {
        // Only take action if mylocation flag was changed by an instance other than me
        if (instance !== this) {
            // I can't have mylocation if the other instance has it already
            if (instance.myLocation) {
                this._canHaveMyLocation = false;
                this._comp.list = [];
            }
            // I can have mylocation if the other instance does not have
            else {
                this._canHaveMyLocation = true;
            }
        }
    }

});

/**
 * PlaceBox object represents a LocationBox for a place
 * @constructor
 */
here.builder.PlaceBox = function () {
    here.builder.LocationBox.apply(this, arguments);
};

/**
 * @type {here.builder.PlaceBox}
 * @extends here.builder.LocationBox
 */
here.builder.PlaceBox.prototype = new here.builder.LocationBox();

// Attaches additional functionality to the PlaceBox element
here.utils.extend(here.builder.PlaceBox.prototype, {
    /**
     * Requests the place data after selecting a result from the select drop-down
     * @private
     */
    _afterSelect: function () {
        here.utils.request(this._result.href, this._handlePlaceRequest.bind(this));
    },

    /**
     * Loads the place data and triggers a 'here-locationbox-change' event
     * @param {object} response
     * @private
     */
    _handlePlaceRequest: function (response) {
        this._place = response;
        this._setReady(true);
        this._trigger('here-locationbox-change');
    },

    /**
     * Clears the PlaceBox element
     * @private
     */
    _clear: function () {
        this._place = null;
        here.builder.LocationBox.prototype._clear.call(this);
    },

    /**
     * Gets the resulting share.here.com URL
     * @returns {string}
     */
    getUrl: function () {
        return this._place.view;
    },

    /**
     * Gets the segment
     */
    getSegment: function () {
        // overrides the parent method
    }
});

/**
 * Link object represents a hypertext link
 * @constructor
 */
here.builder.Link = function () {
    this.element = document.createElement('a');
    this.element.target = '_blank';
    this.element.innerHTML = 'Preview link';
};

/**
 * @type {here.builder.Link}
 * @extends {here.utils.DomView}
 */
here.builder.Link.prototype = new here.utils.DomView();

// Attaches additional functionality to the Link element
here.utils.extend(here.builder.Link.prototype, {
    /**
     * Sets the Link's href attribute
     * @param {string} url - the resulting share.here.com URL
     */
    set: function (url) {
        this.element.href = url;
    },

    /**
     * Disables the Link
     */
    disable: function () {
        this.addClass('disabled');
        this.element.removeAttribute('href');
    },

    /**
     * Enables the Link
     */
    enable: function () {
        this.removeClass('disabled');
    }
});

/**
 * Row object represents a row in the LinkBuilder's form
 * @constructor
 */
here.builder.Row = function () {
    here.utils.DomView.call(this);
    this.addClass('builder-row');
    this.label = new here.utils.DomView();
    this.label.addClass('row-label');
    this.append(this.label);
    this.content = new here.utils.DomView();
    this.content.addClass('row-content');
    this.append(this.content);
};

/**
 * @type {here.builder.Row}
 * @extends {here.utils.DomView}
 */
here.builder.Row.prototype = new here.utils.DomView();

/**
 * TextScreen object represents a DOM textarea element where the the resulting share.here.com URL is being displayed
 * @constructor
 */
here.builder.TextScreen = function () {
    here.utils.DomView.call(this);
    this.addClass('here-text-screen');
    this._screen = document.createElement('textarea');
    this._screen.setAttribute('readonly', true);
    this._screen.addEventListener('focus', this._onFocus.bind(this));
    this.setContent('');
    this.append(this._screen);

    if (here.utils.support.copy) {
        this._copyButton = document.createElement('button');
        this._copyButton.addEventListener('click', this._onCopy.bind(this));
        this._copyButton.title = 'Copy';
        this._copyButton.style.display = 'none';
        this.append(this._copyButton);
    }
};

/**
 * @type {here.builder.TextScreen}
 * @extends {here.utils.DomView}
 */
here.builder.TextScreen.prototype = new here.utils.DomView();

// Attaches additional functionality to the TextScreen element
here.utils.extend(here.builder.TextScreen.prototype, {
    /**
     * Copy the text from the TextScreen
     * @private
     */
    _onCopy: function () {
        this._screen.select();
        var success = document.execCommand('copy');
    },

    /**
     * Reacts to focus on TextScreen
     * @private
     */
    _onFocus: function () {
        this._screen.select();
    },

    /**
     * Sets the share.here.com URL in the TextScreen element
     * @param {string} content
     */
    setContent: function (content) {
        this._screen.innerHTML = content;
        if (this._copyButton) {
            if (content) {
                this._copyButton.style.display = 'inline';
            }
            else {
                this._copyButton.style.display = 'none';
            }
        }
    }
});

/**
 * ResultScreen object represents the area where the resulting share.here.com URL and markup are shown
 * @param {object} panel
 * @constructor
 */
here.builder.ResultScreen = function (panel) {
    here.utils.DomView.call(this);

    this._panel = panel;

    var row = new here.builder.Row();
    row.label.element.innerHTML = "URL:";
    this._urlScreen = new here.builder.TextScreen();
    this._urlScreen.addClass('url-screen');
    row.content.append(this._urlScreen);
    this.append(row);

    row = new here.builder.Row();
    row.label.element.innerHTML = "Markup:";
    this._markupScreen = new here.builder.TextScreen();
    this._markupScreen.addClass('markup-screen');
    row.content.append(this._markupScreen);
    this.append(row);

    row = new here.builder.Row();
    var resetButton = document.createElement('button');
    resetButton.classList.add('here-btn');
    resetButton.classList.add('btn_secondary');
    resetButton.innerHTML = "Clear form";
    resetButton.addEventListener('click', this._reset.bind(this));
    row.content.append(resetButton);
    this._link = new here.builder.Link();
    this._link.addClass('here-btn');
    this._link.disable();
    row.content.append(this._link);
    this.append(row);
};

/**
 * @type {here.builder.ResultScreen}
 * @extends {here.utils.DomView}
 */
here.builder.ResultScreen.prototype = new here.utils.DomView();

//Attaches additional functionality to the ResultScreen element
here.utils.extend(here.builder.ResultScreen.prototype, {
    /**
     * Builds the link and markup and displays them
     * @param {string} url - the resulting share.here.com URL
     */
    display: function (url) {
        if (url) {
            this._link.set(url);
            this._link.enable();
            this._urlScreen.setContent(url);
            this._markupScreen.setContent('<a href="' + url + '">Your text here</a>');
        }
        else {
            this._link.disable();
            this._urlScreen.setContent('');
            this._markupScreen.setContent('');
        }
    },

    /**
     * Resets the ResultScreen element
     * @private
     */
    _reset: function () {
        this._panel.reset();
    }
});

/**
 * RoutePanel object represents the Route tab
 * @constructor
 */
here.builder.RoutePanel = function () {

    var row = new here.builder.Row();
    row.label.element.innerHTML = 'Travel mode:';
    this._transitMode = new here.utils.Select(transportModes);
    this._transitMode.on('here-select-change', this);
    row.content.append(this._transitMode);
    this.append(row);

    row = new here.builder.Row();
    row.addClass('row-pusher');
    row.label.element.innerHTML = 'Map style:';
    this._mapViewType = new here.utils.Select(mapTypes);
    this._mapViewType.on('here-select-change', this);
    row.content.append(this._mapViewType);
    this.append(row);

    row = new here.builder.Row();
    row.addClass('row-route-from');
    row.label.element.innerHTML = 'From:';
    this._from = new here.builder.LocationBoxWithMyLocation('Type a starting location');
    this._from.on('here-locationbox-change', this);
    this._from.on('here-locationbox-ready', this._onFromReady.bind(this));
    this._from.on('here-mylocation-change', this._onMyLocationChange.bind(this));
    row.content.append(this._from);
    this.append(row);

    row = new here.builder.Row();
    row.addClass('row-route-to');
    row.addClass('row-pusher');
    row.label.element.innerHTML = 'To:';
    this._to = new here.builder.LocationBoxWithMyLocation('Type a destination location');
    this._to.on('here-locationbox-change', this);
    this._to.on('here-mylocation-change', this._onMyLocationChange.bind(this));
    row.content.append(this._to);
    this.append(row);

    this._resultScreen = new here.builder.ResultScreen(this);
    this.append(this._resultScreen);
};

/**
 * @type {here.builder.RoutePanel}
 * @extends {here.utils.DomView}
 */
here.builder.RoutePanel.prototype = new here.utils.DomView();

// Attaches additional functionality to the RoutePanel element
here.utils.extend(here.builder.RoutePanel.prototype, {
    /**
     * Handles events, builds URL and displays it
     */
    handleEvent: function () {
        var url;
        if (this._from.ready && this._to.ready) {
            url = here.builder.config.shareURL + 'r/' +
            this._from.getSegment() + '/' +
            this._to.getSegment();

            var params = [];

            var m = this._transitMode.getValue();
            if (m) {
                params.push('m=' + m);
            }

            var t = this._mapViewType.getValue();
            if (t) {
                params.push('t=' + t);
            }

            if (params.length) {
                url = url + '?' + params.join('&');
            }
        }

        this._resultScreen.display(url);
    },

    /**
     * Focuses on the destination field if the start is in ready state
     * @private
     */
    _onFromReady: function () {
        if (!this._to.ready) {
            this._to.getInput().focus();
        }
    },

    /**
     * Reacts to 'here-mylocation-change' event
     * @param {object} e
     * @private
     */
    _onMyLocationChange: function (e) {
        var instance = e.properties.instance;
        this._from.toggle(instance);
        this._to.toggle(instance);
    },

    /**
     * Resets the RoutePanel
     */
    reset: function () {
        this._transitMode.reset();
        this._mapViewType.reset();
        this._from.reset();
        this._to.reset();
    }
});

/**
 * LocationPanel object represents the Location tab
 * @constructor
 */
here.builder.LocationPanel = function () {

    var row = new here.builder.Row();
    row.label.element.innerHTML = 'Map style:';
    this._mapViewType = new here.utils.Select(mapTypes);
    this._mapViewType.on('here-select-change', this);
    row.content.append(this._mapViewType);
    this.append(row);

    row = new here.builder.Row();
    row.addClass('row-pusher');
    row.label.element.innerHTML = 'Address:';
    this._locBox = new here.builder.LocationBox('Type a street address');
    this._locBox.on('here-locationbox-change', this);
    row.content.append(this._locBox);
    this.append(row);

    this._resultScreen = new here.builder.ResultScreen(this);
    this.append(this._resultScreen);
};

/**
 * @type {here.builder.LocationPanel}
 * @extends {here.utils.DomView}
 */
here.builder.LocationPanel.prototype = new here.utils.DomView();

// Attaches additional functionality to the LocationPanel element
here.utils.extend(here.builder.LocationPanel.prototype, {
    /**
     * Handles events, builds URL and displays it
     */
    handleEvent: function () {
        var url;
        if (this._locBox.ready) {
            url = here.builder.config.shareURL + 'l/' +
            this._locBox.getSegment();

            var params = [];

            var t = this._mapViewType.getValue();
            if (t) {
                params.push('t=' + t);
            }

            if (params.length) {
                url = url + '?' + params.join('&');
            }
        }
        this._resultScreen.display(url);
    },

    /**
     * Resets the LocationPanel
     */
    reset: function () {
        this._mapViewType.reset();
        this._locBox.reset();
    }
});

/**
 * PlacePanel object represents the Place tab
 * @constructor
 */
here.builder.PlacePanel = function () {
    var row = new here.builder.Row();
    row.addClass('row-pusher');
    row.label.element.innerHTML = 'POI:';
    this._locBox = new here.builder.PlaceBox('Type the name of a place of interest');
    this._locBox.on('here-locationbox-change', this);
    row.content.append(this._locBox);
    this.append(row);

    this._resultScreen = new here.builder.ResultScreen(this);
    this.append(this._resultScreen);
};

/**
 * @type {here.builder.PlacePanel}
 * @extends {here.utils.DomView}
 */
here.builder.PlacePanel.prototype = new here.utils.DomView();

// Attaches additional functionality to the PlacePanel element
here.utils.extend(here.builder.PlacePanel.prototype, {
    /**
     * Handles event and displays the result
     */
    handleEvent: function () {
        var url;
        if (this._locBox.ready) {
            url = this._locBox.getUrl();
        }
        this._resultScreen.display(url);
    },

    /**
     * Resets the PlacePanel
     */
    reset: function () {
        this._locBox.reset();
    }
});

/**
 * Builder object represents the Link Builder
 * @constructor
 */
here.builder.Builder = function () {
    this.element = document.querySelector('.link_builder');

    this._routePanel = new here.builder.RoutePanel();
    this._locationPanel = new here.builder.LocationPanel();
    this._placePanel = new here.builder.PlacePanel();

    var tabs = new here.utils.Tabs();
    tabs.add('Route', this._routePanel.element, true);
    tabs.add('Address', this._locationPanel.element);
    tabs.add('Place of interest', this._placePanel.element);
    this.append(tabs);
};

/**
 * @type {here.builder.Builder}
 * @extends {here.utils.DomView}
 */
here.builder.Builder.prototype = new here.utils.DomView();

// initialize the builder
new here.builder.Builder();


