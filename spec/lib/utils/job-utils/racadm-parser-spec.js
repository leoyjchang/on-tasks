// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

describe("racadm-parser", function() {
    var parser;
    var racadmOutMock;
    //var corruptRacadmOutMock;
    //var racadmDriveHealthOutMock;

    before('racadm parser before', function() {
        helper.setupInjector([
            helper.require('/spec/mocks/logger.js'),
            helper.require('/lib/utils/job-utils/racadm-parser')
        ]);

        parser = helper.injector.get('JobUtils.RacadmCommandParser');
        racadmOutMock = require('./stdout-helper');
    });


    describe("Software Inventory Parser", function() {
        it("should parse dell server software inventory", function() {

            var tasks = racadmOutMock.racadmSoftwareInventory;
            var result = parser.softwareListData(tasks);
            //console.log(result)
            //expect(result.length).to.equal(17);
            expect(result.iDRAC.FQDD).to.equal('iDRAC.Embedded.1-1');
            expect(result.iDRAC.installationDate).to.equal('2016-01-11T21:55:32Z');
            expect(result.iDRAC.currentVersion).to.equal('2.23.23.21');
            expect(result.iDRAC.rollbackVersion).to.equal('2.20.20.20');
            expect(result.iDRAC.elementName).to.equal('Integrated Dell Remote Access Controller');
            expect(result.NIC1.FQDD).to.equal('NIC.Embedded.1-1-1');
            expect(result.NIC1.installationDate).to.equal('2015-11-26T06:54:17Z');
            expect(result.NIC1.currentVersion).to.equal('16.5.0');
            expect(result.NIC1.elementName).to.equal('Intel(R) Ethernet 10G X520 LOM - 00:8C:FA:F3:78:30');
            expect(result.BIOS.FQDD).to.equal('BIOS.Setup.1-1');
            expect(result.BIOS.installationDate).to.equal('2015-11-26T06:54:10Z');
            expect(result.BIOS.currentVersion).to.equal('1.0.3');
            expect(result.BIOS.rollbackVersion).to.equal('1.0.3');
            expect(result.BIOS.availableVersion).to.equal('1.0.3');
            expect(result.BIOS.elementName).to.equal('BIOS');
            expect(result.Disk1.FQDD).to.equal('Disk.Bay.1:Enclosure.Internal.0-0:RAID.Slot.1-1');
            expect(result.Disk1.installationDate).to.equal('2015-11-26T07:28:09Z');
            expect(result.Disk1.currentVersion).to.equal('TS04');
            expect(result.Disk1.elementName).to.equal('Disk 1 in Backplane 0 of RAID Controller in Slot 1');
        });
    });



    describe("XML to Json Parser", function() {
        it("should convert XML file to Json format", function() {
            var data = racadmOutMock.racadmXml;
            console.log(typeof data);
            var result = parser.xmlToJson(data);
            //console.log(result);
            //expect(result.length).to.equal(17);
            //console.log(result);
        });
    });


    describe("Parse file path", function() {
        it("should parse  remote filename and path", function() {
            var data = "//192.168.191.207/share/bios.xml";
            //console.log(data);
            var result = parser.getPathFilename(data);
            expect(result.path).to.equal('//192.168.191.207/share');
            expect(result.name).to.equal('bios.xml');
            expect(result.style).to.equal('remote');
        });

        it("should parse  remote filename and path", function() {
            var data = "/home/share/bios.xml";
            //console.log(data);
            var result = parser.getPathFilename(data);
            expect(result.path).to.equal('/home/share');
            expect(result.name).to.equal('bios.xml');
            expect(result.style).to.equal('local');
        });
    });

    describe("Parse  JID", function() {
        it("should filter JID from console standard output", function() {
            var data = racadmOutMock.racadmJobIdData;
            //console.log(data);
            var result = parser.getJobId(data);
            expect(result).to.equal('JID_541335487816');
        });
    });

    describe("Parser job status", function() {
        it("should parser job status", function() {
            var data = racadmOutMock.racadmJobStatusData;
            var result = parser.getJobStatus(data);
            expect(result.jobId).to.equal('JID_541347990377');
            expect(result.jobName).to.equal('Configure: Import system configuration XML file');
            expect(result.status).to.equal('Completed');
            expect(result.startTime).to.equal('Not Applicable');
            expect(result.expirationTime).to.equal('Not Applicable');
            expect(result.message).to.equal('SYS054: No configuration changes requiring a system ' +
                'restart need to be applied.');
            expect(result.percentComplete).to.equal('100');
        });
    });

});
