var request = require("request");
var cheerio = require("cheerio");
var fs = require("fs");
var path = require("path");
var program = require("commander");
var _ = require("underscore");

program
    .option('-p, --proxy [string]', 'Config Proxy')
    .option('-l, --location [string]', 'Config Download Location')
    .parse(process.argv);

program.on('help', function() {
    console.log('   Examples:')
    console.log('')
    console.log('       $ ./6min.js -p http://proxy:8080 -l c:\\ ')
    console.log('')

});

var sProxy = program.proxy || "";

var folderPath = program.location || __dirname;
var sixminsPath = path.join(folderPath, "6mins");

var existingFiles = [];

var traverseFileSystem = function(currentPath) {
    var files = fs.readdirSync(currentPath);
    for (var i in files) {
        var currentFile = path.join(currentPath, files[i]);
        var stats = fs.statSync(currentFile);
        if (stats.isFile()) {
            var fileName = currentFile.slice(currentFile.lastIndexOf(path.sep) + 1, currentFile.lastIndexOf("."));
            existingFiles.push(fileName);
            //console.log(currentFile);
        } else if (stats.isDirectory()) {
            traverseFileSystem(currentFile);
        }
    }
};
traverseFileSystem(sixminsPath);
existingFiles = _.uniq(existingFiles);


var sHost = "http://www.bbc.co.uk/";

var options = {
    url: "http://www.bbc.co.uk/worldservice/learningenglish/general/sixminute/",
    proxy: sProxy
};


request(options, function(error, response, body) {

    if (!error && response.statusCode == 200) {

        var p1 = cheerio.load(body);

        p1('.ts-title > a').each(function() {

            var sFileUrL = sHost + p1(this).attr('href');

            request({
                    url: sFileUrL,
                    proxy: sProxy
                },
                function(error, response, body) {
                    if (!error && response.statusCode == 200) {

                        var p2 = cheerio.load(body);

                        var fileName = "";

                        p2('.file-link').each(function() {
                            var sFileLink = p2(this).attr('href');
                            var sFileType = sFileLink.substr(sFileLink.lastIndexOf(".") + 1);
                            if (sFileType == "pdf" || sFileType == "mp3") {

                                if (fileName == "") {
                                    fileName = sFileLink.substring(sFileLink.lastIndexOf("/") + 1, sFileLink.lastIndexOf("."));
                                }
                                var year = sFileLink.substr(sFileLink.lastIndexOf("/") - 7, 4);

                                if (!fs.existsSync(sixminsPath)) {
                                    fs.mkdirSync(sixminsPath);
                                }
                                var sixminsPathOfYear = path.join(sixminsPath, year);
                                if (!fs.existsSync(sixminsPathOfYear)) {
                                    fs.mkdirSync(sixminsPathOfYear);
                                }
                                try {

                                    if (_.indexOf(existingFiles, fileName) == -1) {
                                        var newFileName = path.join(sixminsPathOfYear, fileName + "." + sFileType);
                                        console.log(newFileName);
                                        var r = request({
                                            url: sFileLink,
                                            proxy: sProxy
                                        }).pipe(fs.createWriteStream(newFileName));
                                    }

                                } catch (err) {
                                    console.log("Error occurred " + fileName);
                                }
                            }
                        });
                    }
                });
        });
    }
});