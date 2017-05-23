var webdriver = require('selenium-webdriver'),
    By = require('selenium-webdriver').By,
    until = require('selenium-webdriver').until;

var test = require('selenium-webdriver/testing');
var assert = require('selenium-webdriver/testing/assert');

var driver = new webdriver.Builder()
    .forBrowser('firefox')
    .build();

var $ = function (selector, context) {
    if (context) {
        return context.findElement(By.css(selector));
    }
    return driver.findElement(By.css(selector));
};

var helper = {

    setTab: function (selector) {
        this.tab_selector = selector;
        this.tab = $(selector);
    },

    assertScreenValue: function (element, expected) {
        driver.wait(until.elementTextIs(element, expected));
    },

    assertResult: function (url) {
        var urlScreen = $('.here-text-screen textarea', this.tab);
        var markupScreen = $('.markup-screen textarea', this.tab);

        // Url in the textarea is correct
        this.assertScreenValue(urlScreen, url);

        // Markup is correct
        this.assertScreenValue(markupScreen, '<a href="' + url + '">Your text here</a>');

        // Link is there with correct href
        $('a', this.tab).getAttribute('href').then(function (value) {
            return assert(value).equals(url);
        });

        // Copy button is there
        driver.wait(until.elementLocated(By.css(this.tab_selector + ' .url-screen button')));
        // Copy button is there
        driver.wait(until.elementLocated(By.css(this.tab_selector + ' .markup-screen button')));
    },

    selectOption: function (text) {
        var listitem = driver.wait(until.elementLocated(By.xpath('//li[normalize-space(.)="' + text + '"]')));
        driver.wait(until.elementIsVisible(listitem));
        // Although element is visible, because of the transition it is not yet fully there, so we sleep a bit.
        driver.sleep(300);
        listitem.click();
    },

    sendKeysSelectOption: function (selector, keys, text) {
        $(selector + ' input[type="text"]', this.tab).sendKeys(keys);
        this.selectOption(text);
    },

    selectMyLocation: function (selector) {
        $(selector + ' input[type="text"]', this.tab).click();
        this.selectOption('Use user\'s location');
    }

};

test.describe('Link Builder', function () {

    // Default 2000 ms is not enough for most tests.
    this.timeout(10000);

    test.before(function () {

    });

    test.after(function () {
        driver.quit();
    });

    test.beforeEach(function () {
        driver.get('http://127.0.0.1:5000');
        driver.executeScript('window.scroll(0, 400)');
    });

    test.describe('Route panel', function () {

        test.beforeEach(function () {
            helper.setTab('.here-tabs-body>div:nth-child(1)');
        });


        test.it('should generate route from a to b', function () {
            helper.sendKeysSelectOption('.row-route-from', 'Bremen', 'Bremen, Germany');
            helper.sendKeysSelectOption('.row-route-to', 'Berlin', 'Berlin, Germany');
            helper.assertResult('https://share.here.com/r/53.0751,8.80469,Bremen%2C%20Germany/52.51605,13.37691,Berlin%2C%20Germany?m=d&t=normal');
        });

        test.it('should generate route from mylocation to b', function () {
            helper.selectMyLocation('.row-route-from');
            helper.sendKeysSelectOption('.row-route-to', 'Berlin', 'Berlin, Germany');
            helper.assertResult('https://share.here.com/r/mylocation/52.51605,13.37691,Berlin%2C%20Germany?m=d&t=normal');
        });

        test.it('should generate route from a to mylocation', function () {
            helper.sendKeysSelectOption('.row-route-from', 'Berlin', 'Berlin, Germany');
            helper.selectMyLocation('.row-route-to');
            helper.assertResult('https://share.here.com/r/52.51605,13.37691,Berlin%2C%20Germany/mylocation?m=d&t=normal');
        });

        test.describe('Options', function () {

            test.beforeEach(function () {
                helper.selectMyLocation('.row-route-from');
                helper.sendKeysSelectOption('.row-route-to', 'Berlin', 'Berlin, Germany');
            });

            test.it('should set route mode', function () {
                $('select option:nth-child(2)', helper.tab).click();
                helper.assertResult('https://share.here.com/r/mylocation/52.51605,13.37691,Berlin%2C%20Germany?m=pt&t=normal');
                $('select option:nth-child(3)', helper.tab).click();
                helper.assertResult('https://share.here.com/r/mylocation/52.51605,13.37691,Berlin%2C%20Germany?m=w&t=normal');
            });

            test.it('should set map type', function () {
                $('.builder-row:nth-of-type(2) select option:nth-child(2)', helper.tab).click();
                helper.assertResult('https://share.here.com/r/mylocation/52.51605,13.37691,Berlin%2C%20Germany?m=d&t=terrain');
            });

        });
    });

    test.describe('Location panel', function () {

        test.beforeEach(function () {
            $('.here-tabs-controls li:nth-child(2)').click();
            helper.setTab('.here-tabs-body>div:nth-child(2)');
            helper.sendKeysSelectOption('.location-box', 'Berlin', 'Berlin, Germany');
        });

        test.it('should generate location link', function () {
            helper.assertResult('https://share.here.com/l/52.51605,13.37691,Berlin%2C%20Germany?t=normal');
        });

        test.it('should set map type', function () {
            $('select option:nth-child(2)', helper.tab).click();
            helper.assertResult('https://share.here.com/l/52.51605,13.37691,Berlin%2C%20Germany?t=terrain');
        });

    });

    test.describe('Place panel', function () {

        test.it('should generate place link', function () {
            $('.here-tabs-controls li:nth-child(3)').click();
            helper.setTab('.here-tabs-body>div:nth-child(3)');
            helper.sendKeysSelectOption('.location-box', 'Berlin', 'Berlin, Germany');
            helper.assertResult('https://share.here.com/p/s-YmI9MTMuMTE5MzglMkM1Mi4zNzYxNSUyQzEzLjY1ODAxJTJDNTIuNjYwNTg7Yz1jaXR5LXRvd24tdmlsbGFnZTtpZD0yNzZ1MzNkYi1mYmNmZmQyZTUyZjk0ZjU2YjZmNTU0YzBiYWEzM2YwNjtsYXQ9NTIuNTE2MDc7bG9uPTEzLjM3Njk4O249QmVybGluO25sYXQ9NTIuNTE2MDc7bmxvbj0xMy4zNzY5ODtoPTYwMWIzNw');
        });
    });
});
