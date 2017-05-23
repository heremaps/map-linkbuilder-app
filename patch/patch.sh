#!/bin/bash

patch -d node_modules -p3 < patch/*.patch
