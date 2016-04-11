# HERE Link Builder

### Synopsis

Share.here.com URLs allow you to share HERE Objects - route, address or a POI (Point of Interest).
The share.here.com link will be consumed by share.here.com service and your user will be redirected to an appropriate application, depending on their device.
Redirection logic is handled on the server side.

[Link Builder](./) is a simple interface to create valid share.here.com URLs and code snippets.

You can use the output in your application to provide location related information to your users cross-platform - web, Android and iOS.

### API Reference

For extended documentation see [here](https://developer.here.com/rest-apis/documentation/deeplink-web).

### Installation

Make sure you have already installed the latest version of Node and NPM (Node Package Manager) and then run:

	npm install

### Running the server

	npm run server

A static http server will be started on port 5000, i.e. [http://localhost:5000](http://localhost:5000)

### Tests

Make sure your server is running

	npm run tests

### Other helpful commands:

* Lint: `npm run lint`

### Credits

* [selenium](https://github.com/SeleniumHQ/selenium)
* [jshint](https://github.com/jshint/jshint)
* [mocha](https://github.com/mochajs/mocha)
* [awesomplete](https://github.com/LeaVerou/awesomplete) by [Lea Verou](https://github.com/LeaVerou)
* [http-server](https://github.com/indexzero/http-server) by [indexzero](https://github.com/)

### Copyright

Copyright (c) 2016 HERE Global B.V. and its affiliate(s).
