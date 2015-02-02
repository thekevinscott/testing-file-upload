'use strict';
var express = require('express');
var app = express();
var getRawBody = require('raw-body')

app.set('port', (process.env.PORT || 5000));

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});

app.use(function (req, res, next) {
    if (req.headers['content-type'] === 'application/octet-stream') {
        getRawBody(req, {
            length: req.headers['content-length'],
            //encoding: this.charset
        }, function (err, string) {
            if (err) { return next(err); }
            req.body = string;
            next();
        });
    } else {
        next();
    }
});
app.put('/put', function(request, response) {

    //response.on('data', function(chunk) {
        //console.log('data!');
    //}).on('end', function() {
        //console.log('done');
    //});

    response.json({
        headers: {
            'content-type' : request.headers['content-type'],
            'transfer-encoding' : request.headers['transfer-encoding'],
        },
        fileContents: request.body.toString('utf8')
    });
});

function curlFileUpload() {
    var curlCommand;
    curlCommand = 'curl -v -X PUT -L "http://localhost:5000/put" --header "Content-Type:application/octet-stream" --header "Transfer-Encoding:chunked" -T "file.txt"';
    var exec = require('child_process').exec;
    var child = exec(curlCommand);
    var contents = '';
    child.stdout.on('data', function(data) {
        contents += data;
    });
    child.stderr.on('data', function(data) {
        //console.log('error: ' + data);
    });
    child.on('close', function(code) {
        try {
            console.log('contents', JSON.parse(contents));
        } catch(e) {
            console.log('contents', contents);
        }
    });
};

function requestFileUpload() {
};


// First do a CURL file upload
curlFileUpload();

// Then, do a request upload
requestFileUpload();
