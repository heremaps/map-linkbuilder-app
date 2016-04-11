/** @namespace */
var here = window.here || {};

here.utils = {};
here.utils.support = {};

/**
 * Sends an ajax request
 * @param {string} url - full URL of the request (including parameters)
 * @param {object} eventHandler
 */
here.utils.request = function (url, eventHandler) {
    var ajax = new XMLHttpRequest();
    ajax.open("GET", url);
    ajax.setRequestHeader('Accept', 'application/json');
    ajax.onload = function () {
        var json = JSON.parse(ajax.responseText);
        eventHandler(json);
    };
    ajax.send();
};

/**
 * Debounce function inspired by underscore.js
 * https://davidwalsh.name/javascript-debounce-function
 * @param {function} func
 * @param {number} wait
 * @param {boolean} immediate
 * @returns {function}
 */
here.utils.debounce = function debounce(func, wait, immediate) {
    var timeout;
    return function () {
        var context = this, args = arguments;
        var later = function () {
            timeout = null;
            if (!immediate) {
                func.apply(context, args);
            }
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);

        if (callNow) {
            func.apply(context, args);
        }
    };
};

/**
 * Extends a destination object with a source object
 * @param {object} dest
 * @param {object} src
 */
here.utils.extend = function (dest, src) {
    for (var prop in src) {
        dest[prop] = src[prop];
    }
};

/**
 * Checks if the browser supports copy functionality
 */
here.utils.support.copy = (function () {
    var support = false;
    try {
        support = document.queryCommandSupported('copy');
    }
    catch (err) {

    }

    return support;

})();

/**
 * DomView object represents a simple DOM div element
 * @constructor
 */
here.utils.DomView = function () {
    this.element = document.createElement('div');
};

// Attaches additional functionality to the DomView element
here.utils.DomView.prototype = {
    /**
     * Appends a DOM element to the DomView
     * @param ob
     */
    append: function (ob) {
        if (ob instanceof HTMLElement) {
            this.element.appendChild(ob);
        }
        else if (ob instanceof here.utils.DomView) {
            this.element.appendChild(ob.element);
        }
    },

    /**
     * Dispatches an event
     * @param {string} name
     * @param {object} properties
     * @private
     */
    _trigger: function (name, properties) {
        var evt = document.createEvent("HTMLEvents");
        evt.properties = properties;
        evt.initEvent(name, true, true);
        this.element.dispatchEvent(evt);
    },

    /**
     * Shows the element
     */
    show: function () {
        this.element.removeAttribute('hidden');
    },

    /**
     * Hides the element
     */
    hide: function () {
        this.element.setAttribute('hidden', true);
    },

    /**
     * Adds an event listener
     * @param {string} name
     * @param {object} eventHandler
     */
    on: function (name, eventHandler) {
        this.element.addEventListener(name, eventHandler);
    },

    /**
     * Adds specified class value
     * @param {string} name
     */
    addClass: function (name) {
        this.element.classList.add(name);
    },

    /**
     * Removes specified class value
     * @param {string} name
     */
    removeClass: function (name) {
        this.element.classList.remove(name);
    }
};

/**
 * Select object represents an HTML select element
 * @param {array} options
 * @param {string} title
 * @constructor
 */
here.utils.Select = function (options, title) {
    here.utils.DomView.call(this);
    this._value = '';

    this.element = document.createElement('select');

    if (title) {
        this._createOption({label: title, value: ''});
    }

    options.forEach(this._createOption, this);

    this.element.addEventListener('change', this);

};

/**
 * @type {here.utils.Select}
 * @extends DomView
 */
here.utils.Select.prototype = new here.utils.DomView();

// Attaches additional functionality to the Select element
here.utils.extend(here.utils.Select.prototype, {
    /**
     * Triggers a 'here-select-change' event
     * @param e
     */
    handleEvent: function (e) {
        this._value = e.target.value;
        this._trigger('here-select-change');
    },

    /**
     * Gets the selected value by the user
     * @returns {string}
     */
    getValue: function () {
        return this._value;
    },

    /**
     * Creates and adds an option to the Select element
     * @param {object} optionParams
     * @private
     */
    _createOption: function (optionParams) {
        var option = document.createElement('option');
        option.innerHTML = optionParams.label;
        option.value = optionParams.value;
        if (optionParams.default) {
            option.selected = true;
            this._value = option.value;
            this._defaultValue = option.value;
        }
        this.element.appendChild(option);
    },

    /**
     * Resets the Select element and triggers a 'here-select-change' event
     */
    reset: function () {
        this.element.value = this._defaultValue;
        this._value = this._defaultValue;
        this._trigger('here-select-change');
    }
});

/**
 * Tab object represents a single tab
 * @param {object} tabs - Tabs object
 * @param {string} label - Tab label
 * @param {object} panel - panel associated with the tab
 * @param {boolean} defaultTab - indicates if the tab is the default(selected) one
 * @constructor
 */
here.utils.Tab = function (tabs, label, panel, defaultTab) {
    this.tabs = tabs;
    this.control = document.createElement('li');
    this.control.innerHTML = label;
    this.control.addEventListener('click', this._onSelect.bind(this));

    this.panel = panel;

    this.tabs.on('here-tab-change', this._onTabChange.bind(this));

    if (defaultTab) {
        this.show();
    }
    else {
        this.hide();
    }
};

// Attaches additional functionality to the Tab element
here.utils.Tab.prototype = {
    /**
     * Reacts on select event
     * @private
     */
    _onSelect: function () {
        this.tabs.change(this);
    },

    /**
     * Handles tab visibility
     * @param {object} e
     * @private
     */
    _onTabChange: function (e) {
        var tab = e.properties.tab;
        if (tab === this) {
            this.show();
        }
        else {
            this.hide();
        }
    },

    /**
     * Shows the active tab
     */
    show: function () {
        this.panel.style.display = 'block';
        this.control.classList.add('here-tab-active');
    },

    /**
     * Hides the active tab
     */
    hide: function () {
        this.panel.style.display = 'none';
        this.control.classList.remove('here-tab-active');
    }
};

/**
 * Tabs object represents the tabs
 * @constructor
 */
here.utils.Tabs = function () {
    this.element.classList.add('here-tabs');
    this._controlsElement = document.createElement('ul');
    this._controlsElement.classList.add('here-tabs-controls');
    this.append(this._controlsElement);
    this._body = document.createElement('div');
    this._body.classList.add('here-tabs-body');
    this.append(this._body);
};

/**
 * @type {here.utils.Tabs}
 * @extends DomView
 */
here.utils.Tabs.prototype = new here.utils.DomView();

// Attaches additional functionality to the Tab element
here.utils.extend(here.utils.Tabs.prototype, {
    /**
     * Triggers a 'here-tab-change' event
     * @param {object} tab
     */
    change: function (tab) {
        this._trigger('here-tab-change', {tab: tab});
    },

    /**
     * Adds a new Tab to the Tabs
     * @param {string} label - Tab label
     * @param {object} panel - panel associated with the tab
     * @param {boolean} defaultTab - indicates if the tab is the default(selected) one
     */
    add: function (label, panel, defaultTab) {
        var tab = new here.utils.Tab(this, label, panel, defaultTab);
        this._controlsElement.appendChild(tab.control);
        this._body.appendChild(tab.panel);
    }
});
