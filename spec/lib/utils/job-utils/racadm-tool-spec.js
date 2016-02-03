// Copyright 2015, EMC, Inc.
/* jshint node: true */

'use strict';

describe("racadm-tool", function() {
    var instance, parser, ChildProcess;

    var mockChildProcessFactory = function() {
        function MockChildProcess(command, args, env, code) {
            this.command = command;
            this.args = args;
            this.env = env;
            this.code = code;
        }
        MockChildProcess.prototype.run = function (delay) {
            var self = this;
            //return new Promise(function(resolve, reject){
            var command = self.command,
                args = self.args;
            var subCommandIndex = args.join(' ').indexOf('get BIOS'),
                pwdIndex = args.join(' ').indexOf('-p admin'),
                hostIndex = args.join(' ').indexOf('-r ');

            if (hostIndex === -1){
                return Promise.resolve({
                    stdout: 'Get BIOS Correctly'
                });
            }

            if( subCommandIndex !== -1) {
                    if (pwdIndex !== -1) {
                        return Promise.resolve({
                            stdout: 'Get BIOS Correctly'
                        });
                    } else {
                        return Promise.resolve({
                            stderr: 'ERROR: Login failed - invalid username or password\n'
                        });
                    }
            }
        };
        return MockChildProcess;
    };

    before('racadm tool before', function() {
        helper.setupInjector([
            helper.require('/lib/utils/job-utils/racadm-tool'),
            helper.require('/lib/utils/job-utils/racadm-parser'),
            helper.di.simpleWrapper(mockChildProcessFactory(), 'ChildProcess')
        ]);
        instance = helper.injector.get('JobUtils.RacadmTool');
        parser = helper.injector.get('JobUtils.RacadmCommandParser');
        //ChildProcess = helper.injector.get('ChildProcess');
        //debugger;
    });

    describe('instance', function(){

        before(function() {
            this.sandbox = sinon.sandbox.create();
        });

        describe('runCommand', function(){
            afterEach('runCommand after', function() {
                this.sandbox.restore();
            });

            it('should get console standard out if succeed', function() { //what is done for?
                return instance.runCommand('192.168.188.103','admin', 'admin', 'get BIOS')
                    .then(function(ret){
                        expect(ret).to.be.equals('Get BIOS Correctly')
                    });
            });

            it('should get console standard error if failed', function() { //what is done for?
                return instance.runCommand('192.168.188.103','admin', 'admi', 'get BIOS')
                    .should.be.rejectedWith({
                        error: undefined,
                        stderr: 'ERROR: Login failed - invalid username or password\n'
                    });
            });

            it('should get console standard out if tried local command', function() { //what is done for?
                return instance.runCommand('','admin', 'admin', 'get BIOS')
                    .then(function(ret){
                        expect(ret).to.be.equals('Get BIOS Correctly');
                    });
            });

        });

        describe('enableIpmi', function(){
            afterEach('runCommand after', function() {
                this.sandbox.restore();
            });

            it('exists', function() {
                should.exist(instance.enableIpmi);
            });
            it('is a function', function() {
                expect(instance.enableIpmi).is.a('function');
            });

            it('should enable IPMI', function(){
                this.sandbox.stub(instance, 'runCommand').resolves();
                return instance.enableIpmi('any','any','any')
                    .then(function(){
                        expect(instance.runCommand).to.have.been.calledOnce;
                    });
            });
        });

        describe('disableIpmi', function(){

            afterEach('runCommand after', function() {
                this.sandbox.restore();
            });

            it('exists', function() {
                should.exist(instance.disableIpmi);
            });
            it('is a function', function() {
                expect(instance.disableIpmi).is.a('function');
            });

            it('should disable IPMI', function(){
                this.sandbox.stub(instance, 'runCommand').resolves();
                return instance.disableIpmi('any','any','any')
                    .then(function(){
                        expect(instance.runCommand).to.have.been.calledOnce;
                    });
            });
        });

        describe('getJobStatus', function(){
            before('setBiosConfig before', function() {
                this.jobId = 'JID_927008261880';
            });
            afterEach('setBiosConfig after', function() {
                this.sandbox.restore();
            });

            it('should get job status', function() {
                var self = this ;
                this.sandbox.stub(parser, 'getJobStatus').returns('somevalue');
                this.sandbox.stub(instance, 'runCommand').resolves();
                return instance.getJobStatus('192.168.188.103','admin', 'admin', self.jobId)
                    .then(function(ret){
                        expect(instance.runCommand).to.have.been.calledOnce;
                        expect(parser.getJobStatus).to.have.been.calledOnce;
                        expect(ret.jobStatus).to.equals('somevalue');
                    });
            });

            it('should throw errors', function() {
                var self = this ;
                this.sandbox.stub(parser, 'getJobStatus').returns();
                this.sandbox.stub(instance, 'runCommand').rejects({error: "Error happend"});
                return instance.getJobStatus('192.168.188.103','admin', 'admin', self.jobId)
                    .catch(function(err){
                        debugger;
                        expect(instance.runCommand).to.have.been.calledOnce;
                        expect(parser.getJobStatus).to.not.have.been.called;
                        expect(err.error).to.equals("Error happend");
                    });
            });

        });

        describe('waitJobDone', function(){
            var getJobStatusStub, waitJobDoneSpy;
            beforeEach('waitJobDone before', function() {
                getJobStatusStub = this.sandbox.stub(instance, 'getJobStatus');
                waitJobDoneSpy = this.sandbox.spy(instance, 'waitJobDone');
                this.jobId = 'JID_927008261880';
                this.jobStatus = {
                    jobId: 'JID_927008261880',
                    jobName: 'Configure: Import system configuration XML file',
                    status: 'Completed',
                    startTime: 'Not Applicable',
                    expirationTime: 'Not Applicable',
                    message: 'SYS053: Successfully imported and applied system configuration XML file.',
                    percentComplete: '100'
                };
            });
            afterEach('waitJobDone after', function() {
                this.sandbox.restore();
            });

            it('should get job status completion status correctly', function() {
                var self = this ;
                getJobStatusStub.resolves({jobStatus: self.jobStatus});
                return instance.waitJobDone('192.168.188.103','admin', 'admin', self.jobId, 0, 100)
                    .then(function(ret){
                        expect(instance.getJobStatus).to.have.been.calledOnce;
                        expect(ret.jobStatus).to.equals(self.jobStatus);
                    });
            });

            it('should throw job failed errors', function() {
                var self = this ;
                self.jobStatus.status = 'Failed';
                getJobStatusStub.resolves({jobStatus: self.jobStatus});
                return instance.waitJobDone('192.168.188.103','admin', 'admin', self.jobId, 0, 100)
                    .catch(function(err){
                        expect(err.error).to.equals('Job Failed during process');
                        expect(err.jobStatus).to.deep.equals(self.jobStatus);
                        expect(instance.getJobStatus).to.be.calledOnce;
                    });
            });

            it('should get job status completion status correctly after iteration', function() {
                var self = this, runningJobStatus = {};
                for (var key in self.jobStatus){
                    runningJobStatus[key]=self.jobStatus[key];
                }
                runningJobStatus.status = 'Running';
                getJobStatusStub.resolves({jobStatus: runningJobStatus})
                    .onCall(3).resolves({jobStatus: self.jobStatus});

                return instance.waitJobDone('192.168.188.103','admin', 'admin', self.jobId, 0, 0.1)
                    .then(function() {
                        expect(instance.waitJobDone.callCount).to.equal(4);
                        expect(instance.getJobStatus.callCount).to.equal(4);
                    });
            });

            it('should call itself until timeout', function(done) {
                var self = this ;
                self.jobStatus.status = 'Running';
                getJobStatusStub.resolves({jobStatus:self.jobStatus});
                return instance.waitJobDone('192.168.188.103','admin', 'admin', self.jobId, 0, 0)
                    .then(function() {
                        done(new Error("Expected waitJobDone to fail"));
                    })
                    .catch(function(err) {
                        expect(instance.waitJobDone.callCount).to.equal(11);
                        expect(instance.getJobStatus.callCount).to.equal(11);
                        expect(err.error).to.equals('Job Timeout');
                        expect(err.jobStatus).to.deep.equals(self.jobStatus);
                        done();
                    });
            });

            it('should report error if status is undefined', function(done) {
                var self = this ;
                self.jobStatus.status = 'Anything';
                getJobStatusStub.resolves({jobStatus:self.jobStatus});
                return instance.waitJobDone('192.168.188.103','admin', 'admin', self.jobId, 0, 0)
                    .then(function() {
                        done(new Error("Expected waitJobDone to fail"));
                    })
                    .catch(function(err) {
                        expect(instance.waitJobDone.callCount).to.equal(1);
                        expect(instance.getJobStatus.callCount).to.equal(1);
                        expect(err.error).to.equals('Job status is incorrect');
                        expect(err.jobStatus).to.deep.equals(self.jobStatus);
                        done();
                    });
            });

        });

        describe('setBiosConfig', function(){
            var runCommandStub, getJobIdStub, waitJobDoneStub, getPathFilenameStub;
            beforeEach('setBiosConfig before', function() {
                runCommandStub = this.sandbox.stub(instance, 'runCommand');
                getJobIdStub = this.sandbox.stub(parser, 'getJobId');
                waitJobDoneStub =  this.sandbox.stub(instance, 'waitJobDone');
                getPathFilenameStub = this.sandbox.stub(parser, 'getPathFilename');
                this.cifsConfig = {
                    user: 'onrack',
                    password: 'onrack',
                    filePath: '//192.168.188.113/share/bios.xml'
                };
                this.fileInfo = {
                    name: 'bios.xml',
                    path: '//192.168.188.113/share',
                    style: 'remote'
                };
            });

            afterEach('setBiosConfig after', function() {
                this.sandbox.restore();
            });

            it('should set BIOS configure via local file', function(){
                var self = this,
                    command = "set -f bios.xml -t xml -u onrack -p onrack -l //192.168.188.113/share";
                getPathFilenameStub.returns(self.fileInfo);
                runCommandStub.resolves(); //Any value, add for need
                getJobIdStub.returns();
                waitJobDoneStub.resolves();
                return instance.setBiosConfig('192.168.188.113','admin', 'admin', self.cifsConfig)
                    .then(function(){
                        expect(instance.runCommand).to.be.calledWith('192.168.188.113','admin', 'admin', command);
                        expect(parser.getPathFilename).to.have.been.calledOnce;
                        expect(instance.runCommand).to.have.been.called;
                        expect(parser.getJobId).to.have.been.calledOnce;
                        expect(instance.waitJobDone).to.have.been.called;
                    });
            });

            it('should set BIOS configure via remote file', function(){
                var self = this,
                    command = "set -f /home/share/bios.xml -t xml";
                self.fileInfo.path = '/home/share';
                self.fileInfo.style = 'local';
                getPathFilenameStub.returns(self.fileInfo);
                runCommandStub.resolves(); //Any value, add for need
                getJobIdStub.returns();
                waitJobDoneStub.resolves();
                return instance.setBiosConfig('192.168.188.113','admin', 'admin', self.cifsConfig)
                    .then(function(){
                        expect(instance.runCommand).to.be.calledWith('192.168.188.113','admin', 'admin', command);
                    });
            });

            it('should failed if get promise failure', function(){
                var self = this;
                getPathFilenameStub.returns(self.fileInfo);
                runCommandStub.resolves(); //Any value
                getJobIdStub.returns();
                waitJobDoneStub.rejects({error: "Error happend"});
                return instance.setBiosConfig('192.168.188.103','admin', 'admin', self.cifsConfig).
                    should.be.rejectedWith({error: "Error happend"});
            });

            it('should failed if get invalide xml file', function(){
                var self = this;
                self.fileInfo.style = '';
                getPathFilenameStub.returns(self.fileInfo);
                return instance.setBiosConfig('192.168.188.103','admin', 'admin', self.cifsConfig).
                    should.be.rejectedWith({ error: 'XML file path is invalid'});
            });

        });

    });
});
