
var path = require('path');
var fs = require('fs');
var AD = require('ad-utils');
var async = require('async');


var sailsObj = null;


// Our Mock Objects
var mockGMAAPI = require(path.join(__dirname, 'mock', 'gma-api.js'));
var mockCAS    = require(path.join(__dirname, 'mock', 'CAS.js'));
var mockAD     = AD.test.mockAD;

var reqObj     = { session:{} };        // a reuseable valid req object



var assert = require('chai').assert;
describe('test GMA.measurementsForRequest()',function(){



    before(function(done){

        // loading Sails can take a few seconds:
        this.timeout(60000);

        async.series([

            // load Sails:  AD.test.sails.load( fn(err, sails) );
            function(next) {

                AD.test.sails.load()
                .fail(function(err){
                    AD.log.error('... error loading sails : ', err);
                    next(err);
                })
                .done(function(obj) {
                    sailsObj = obj;
                    next();
                });

            },



            // // prepare data : AD.test.db.init( sails, [ { 'modelName':file/path/data.js'}, ...])
            // function(next) {


            //     var definitions = [
            //         {model:LNSSCoreNSC, key:'nsc_id',               path:path.join(process.cwd(), 'setup', 'test_data', 'data_nss_nsc.js' )},
            //         {model:LNSSCoreNSCTerritory, key:'coverage_id', path:path.join(process.cwd(), 'setup', 'test_data', 'data_nss_nsc_territory.js' )},
            //         {model:LNSSRen, key:'nssren_id',                path:path.join(process.cwd(), 'setup', 'test_data', 'data_nss_ren.js' )}
                    
            //         // {model:LNSSCoreNSC, path:path.join(process.cwd(), 'setup', 'test_data', 'data_nss_nsc.js' )}
            //     ];

            //     AD.test.data.load(definitions)
            //     .fail(function(err){
            //         next(err);
            //     })
            //     .done(function(){
            //         next();
            //     });
                  
            // },



            // // service = AD.test.service(sails, 'LegacyStewardwise');
            // function(next) {
            //     service = LegacyStewardwise.staffForNSCByGUID;

            //     next();
            // }


            function(next) {

                // properly initialize the req object with a test.guid  using user.
                ADCore.auth.markAuthenticated(reqObj, 'test.guid');
                next();
            }


        ], function(err, results){

            if (err){
                done(err);
            } else {
// AD.log('... ... done();')
                done();
            }
        });
        

    });

    after(function(done){

        // AD.test.data.restore([LNSSCoreNSC])
        // .fail(function(err){
        //     done(err);
        // })
        // .done(function(){
        //     done();
        // });
        done();

    });



    it('calling .measurementsForRequest() with no parameters should result in a rejected deferred:',function(done){

        GMA.measurementsForRequest()
        .fail(function(err){
            assert.ok(true, ' --> should respond with an error. ');
            assert.include(err.message, 'INVALID_PARAMS', ' --> error.message included INVALID_PARAMS:');
            done();
        })
        .done(function(data){
            assert.ok(false, ' --> should not have been called. ');
            done();
        })

    });



    it('calling .measurementsForRequest() with no .req  parameter should result in a rejected deferred:',function(done){

        GMA.measurementsForRequest({})
        .fail(function(err){
            assert.ok(true, ' --> should respond with an error. ');
            assert.include(err.message, 'INVALID_PARAMS', ' --> error.message included INVALID_PARAMS:');
            done();
        })
        .done(function(data){
            assert.ok(false, ' --> should not have been called. ');
            done();
        })

    });



    it('calling .measurementsForRequest() with no .nodeId  parameter should result in a rejected deferred:',function(done){

        GMA.measurementsForRequest({ req:reqObj })
        .fail(function(err){
            assert.ok(true, ' --> should respond with an error. ');
            assert.include(err.message, 'INVALID_PARAMS', ' --> error.message included INVALID_PARAMS:');
            done();
        })
        .done(function(data){
            assert.ok(false, ' --> should not have been called. ');
            done();
        })

    });



    it('calling .measurementsForRequest() on success should return an array :',function(done){

        var originalObjects = GMA.____originalObjects();

        var cas = new mockCAS();
        mockAD.reset();

        // array of assignments
        var assignments = [
            {   nodeId: 1, shortName:'assignment1', role:'staff' },
            {   nodeId: 2, shortName:'assignment2', role:'staff' },
            {   nodeId: 3, shortName:'assignment3', role:'staff' },
        ];
        mockGMAAPI.setAssignments(assignments);  

        mockGMAAPI.setMeasurements([]);

        GMA.____mockObjects({ casService: cas, gmaAPI:mockGMAAPI, AD:mockAD, cachedConnections:{} });




        GMA.measurementsForRequest({ req:reqObj, nodeId:1 })
        .fail(function(err){
            assert.ok(false, ' --> should not have responded with an error. ');
            // return the original objects
            GMA.____mockObjects(originalObjects);
            done();
        })
        .done(function(data){
            assert.ok(true, ' --> should have responded successfully ');
            assert.isArray(data, ' --> should return an array ');

            // return the original objects
            GMA.____mockObjects(originalObjects);
            done();
        })

    });



    it('calling .measurementsForRequest() on success should return expected results :',function(done){
        
        var originalObjects = GMA.____originalObjects();

        var cas = new mockCAS();
        mockAD.reset();

        // array of assignments
        var assignments = [
            {   nodeId: 1, shortName:'assignment1', role:'staff' },
            {   nodeId: 2, shortName:'assignment2', role:'staff' },
            {   nodeId: 3, shortName:'assignment3', role:'staff' },
        ];
        mockGMAAPI.setAssignments(assignments);  

        var measurements = [
            {   reportId:1, measurementId:1, measurementName:'name1',  
                measurementDescription:'desc1',  measurementValue:1, role:'staff'
            },
            {   reportId:2, measurementId:2, measurementName:'name2',  
                measurementDescription:'desc2',  measurementValue:2, role:'staff'
            }
        ];
        mockGMAAPI.setMeasurements(measurements);

        GMA.____mockObjects({ casService: cas, gmaAPI:mockGMAAPI, AD:mockAD, cachedConnections:{} });




        GMA.measurementsForRequest({ req:reqObj, nodeId:1 })
        .fail(function(err){
            assert.ok(false, ' --> should not have responded with an error. ');
            // return the original objects
            GMA.____mockObjects(originalObjects);
            done();
        })
        .done(function(data){
            assert.ok(true, ' --> should have responded successfully ');
            assert.isArray(data, ' --> should return an array ');
// AD.log( '... returned data:',data);
            assert.lengthOf(data, measurements.length, ' --> should have returned same number as given measurements');

            // return the original objects
            GMA.____mockObjects(originalObjects);
            done();
        })

    });





 });

