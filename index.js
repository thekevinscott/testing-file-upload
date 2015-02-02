'use strict';
var express = require('express');
var app = express();
var getRawBody = require('raw-body')
var fs = require('fs');
var request = require('request');
var putURL = 'http://localhost:5000/put';
var filePath = 'file.txt';
var contentType = 'application/octet-stream';
var transferEncoding = 'chunked';

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
    var body;
    if ( request.body ) {
        body = request.body.toString('utf8');
    } else {
        body = '';
    }

    response.json({
        headers: {
            'content-type' : request.headers['content-type'],
            'transfer-encoding' : request.headers['transfer-encoding'],
        },
        fileContents: body
    });
});

function curlFileUpload(callback) {
    var curlCommand;
    curlCommand = 'curl -v -X PUT -L "'+putURL+'" --header "Content-Type:'+contentType+'" --header "Transfer-Encoding:'+transferEncoding+'" -T "'+filePath+'"';
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
            contents = JSON.parse(contents);
        } catch(e) { }
        if ( callback ) {
            callback(contents);
        }
    });
};

function requestFileUploadString(callback) {
    var options = {
        method: 'put',
        headers: {
            'content-type': contentType,
            'transfer-encoding': transferEncoding
        }, 
        body: fs.readFileSync(filePath, 'utf8'),
        //body: fs.createReadStream(filePath),
        //fs.createReadStream(filePath)
        //multipart : [
        //]
    };
    request(putURL, options, function(err, httpResponse, body) {
        if ( err ) {
            console.log('err', err);
        } else {
            try {
                body = JSON.parse(body);
            } catch(e) {}

            if ( callback ) {
                callback(body);
            }
        }
    });
};

function requestFileUploadStream(callback) {
    var options = {
        method: 'put',
        headers: {
            'content-type': contentType,
            'transfer-encoding': transferEncoding
        }
    };
    fs.createReadStream(filePath).pipe(request.put(putURL,options,function(err, httpsResponse, body){
        if ( err ) {
            console.log('err', err);
        } else {
            try {
                body = JSON.parse(body);
            } catch(e) {}

            if ( callback ) {
                callback(body);
            }
        }
    }));
};


// First do a CURL file upload
curlFileUpload(function(contents) {
    console.log('\n');
    if ( runTest(contents) === 1 ) {
        console.log('*** All tests passed for CURL upload.');
    } else {
        console.log('*** Tests failed. CURL response');
        console.log(contents);
    }
});

// Then, do a request upload reading the file into memory
requestFileUploadString(function(contents) {
    console.log('\n');
    if ( runTest(contents) === 1 ) {
        console.log('*** All tests passed for Request string upload.');
    } else {
        console.log('*** Tests failed. Request Stream response');
        console.log(contents);
    }
});

// Then, do a request upload reading the file as a stream 
requestFileUploadStream(function(contents) {
    console.log('\n');
    if ( runTest(contents) === 1 ) {
        console.log('*** All tests passed for Request Stream upload.');
    } else {
        console.log('*** Tests failed. Request Stream response');
        console.log(contents);
    }
});

function runTest(contents) {
    var expectedFileContents = fs.readFileSync(filePath, 'utf8');
    if ( ! contents ) { console.error('No Contents'); }
    else if ( contents.headers['content-type'] !== contentType ) {
        console.error('Content type does not match');
        console.log('Expected', contentType, 'Actual', contents.headers['content-type']);
    }
    else if ( contents.headers['transfer-encoding'] !== transferEncoding ) {
        console.error('Transfer Encoding does not match');
        console.log('Expected', transferEncoding, 'Actual', contents.headers['transfer-encoding']);
    }
    else if ( contents.fileContents != expectedFileContents ) {
        console.error('File Contents do not match');
        console.log('Expected', expectedFileContents, 'Actual', contents.fileContents);
    } else {
        return 1;
    }
};
