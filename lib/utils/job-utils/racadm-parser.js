// Copyright 2015, EMC, Inc.
// jshint bitwise: false

// Javascript port of the ipmitool sensors parser from
// http://docs.openstack.org/developer/ironic/
//   _modules/ironic/drivers/modules/ipmitool.html

"use strict";

var di = require('di'),
    xml2js = require('xml2js'),
    fs = require('fs');

module.exports = parseRacadmDataFactory;
di.annotate(parseRacadmDataFactory, new di.Provide('JobUtils.RacadmCommandParser'));
di.annotate(parseRacadmDataFactory, new di.Inject('Assert', '_'));
function parseRacadmDataFactory(assert, _) {

    function RacadmCommandParser(){ }

    RacadmCommandParser.prototype.softwareListData = function(softwareListData) {
        var lines = softwareListData.trim().split('\n');
        var filteredLines = _.filter(lines, function(line){
            return line.indexOf('=') !== -1 && line.indexOf('ComponentType') === -1;
        });
        var groupedData = _.chunk(filteredLines, 4);
        var softwareInventory = {};
        //Example of groupedData Element
        //data[0] - 'ElementName = Intel(R) Ethernet 10G X520 LOM - 00:8C:FA:F3:78:30'
        //data[1] - 'FQDD = NIC.Embedded.1-1-1'
        //data[2] - 'InstallationDate = 2015-11-26T06:54:17Z'
        //data[3] - 'Current Version = 16.5.0'
        _.forEach(groupedData, function(data){
            var row = [];
            for(var i = 0; i < data.length; i += 1){
                var name = data[i].split('=')[0].trim().replace(' ',''),
                    info = data[i].split('=')[1].trim();
                var lowerFirstChar = name.substr(0,1).toLowerCase().concat(name.substr(1));
                row.push([lowerFirstChar, info]);
            }
            var deviceName = row[1][1].split(':')[0];
            var deviceInfo = {
                elementName: '',
                FQDD: '',
                installationDate: '',
                currentVersion: '',
                rollbackVersion: '',
                availableVersion: ''
            };
            if (softwareInventory.hasOwnProperty(deviceName)){
                deviceInfo = softwareInventory[deviceName];
                if (deviceInfo.installationDate === 'NA'){
                    deviceInfo.installationDate = row[2][1];
                }
                if (!deviceInfo[row[3][0]]){
                    deviceInfo[row[3][0]] = row[3][1];
                }
            } else {
                deviceInfo.elementName = row[0][1];
                deviceInfo.FQDD = row[1][1];
                deviceInfo.installationDate = row[2][1];
                deviceInfo[row[3][0]] = row[3][1];
            }
            /*
             if (softwareInventory.hasOwnProperty(deviceName)){
             deviceInfo = softwareInventory[deviceName];
             deviceInfo[row[3][0]] = row[3][1];
             if (deviceInfo[row[2][0]] === 'NA'){
             deviceInfo[row[2][0]] = row[2][1];
             }
             } else{
             for(var j = 0; j < data.length; j += 1){
             deviceInfo[row[j][0]] = row[j][1];
             }
             }
             */
            softwareInventory[deviceName] = deviceInfo;
        });
        return this.simplifyKeyName(softwareInventory);
    };


    RacadmCommandParser.prototype.simplifyKeyName = function(softwareList) {
        var newKeyArray = [], oldKeyArray = [],
            suffixArray = [], preffixArray = [], newSoftwareList = {};

        for (var key in softwareList){
            preffixArray.push(key.toString().split('. ')[0]);
            suffixArray.push(key.toString().split(':')[0].split('.')[2]);
            oldKeyArray.push(key);
        }
        for (var i = 0; i < oldKeyArray.length; i+=1){
            var preffix = preffixArray[i],
                suffix = suffixArray[i].split('-')[0];
            if(_.countBy(preffixArray)[preffix] === 1){
                newKeyArray[i] = preffix;
            } else {
                /* Another option: create device name suffix
                 if(keyCount[preffix]){
                 keyCount.preffix += 1;
                 } else{
                 keyCount[preffix] = 0;
                 }
                 newKeyArray[i] = preffix + keyCount.preffix.toString();
                 */
                newKeyArray[i] = preffix.concat(suffix);
            }
            newSoftwareList[newKeyArray[i]] = softwareList[oldKeyArray[i]];
        }
        return newSoftwareList;
    };

    /*RacadmCommandParser.prototype.xmlToJson = function(xmlData) {
        var xmlToJsonParser = new xml2js.Parser();
        fs.readFile('./spec/lib/utils/job-utils/samplefiles/racadm-bios.xml', function(err, data) {
            xmlToJsonParser.parseString(data, function (err, result) {
                console.dir(JSON.stringify(result));
                console.log('Done');
            });
        });
        /*return xmlToJsonParser.parseString(xmlData, function(err, out) {
            if (err) {
                return {error: err };
            } else {
                return out;
            }
        });
    };*/

    RacadmCommandParser.prototype.getPathFilename = function(data) {
        assert.string(data);
        var filename = data.slice(data.lastIndexOf('/')+1),
            path = data.slice(0, data.lastIndexOf('/')),
            style = '';

        if (path.indexOf('//') === 0) {
            style = 'remote';
        } else if (path.indexOf('/') === 0) {
            style = 'local';
        }

        return {name: filename, path: path, style: style};
    };

    RacadmCommandParser.prototype.getJobId = function(data) {
        var lines = data.trim().split('\n');
        var filteredLine = _.filter(lines, function(line){
            return line.indexOf('JID_') !== -1;
        });
        return _.last(filteredLine[0].split('"')[1].split(' ')).trim();
    };

    RacadmCommandParser.prototype.getJobStatus = function(data) {

        var lines = data.trim().split('\n');
        var filteredLines = _.filter(lines, function(line){
            return line.indexOf('=') !== -1 ;
        });
        var column = _.map(filteredLines, function(line){
            line = line.split('=')[1].trim();
            return line.replace('[', '').replace(']', '');
        });
        return {
            jobId: column[0],
            jobName: column[1],
            status: column[2],
            startTime: column[3],
            expirationTime: column[4],
            message: column[5],
            percentComplete: column[6]
        };
    };

    return new RacadmCommandParser();
}
