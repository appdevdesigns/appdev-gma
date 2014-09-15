
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
describe('test GMA._authenticateProxy()',function(){



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



    it('calling ._authenticateProxy() with no parameters should result in a rejected deferred:',function(done){

        GMA._authenticateProxy()
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



    it('calling ._authenticateProxy() with no .req  parameter should result in a rejected deferred:',function(done){

        GMA._authenticateProxy({})
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



    it('calling ._authenticateProxy() with no config.appdev_gma.baseURL set results in an error:',function(done){

        var currSetting = null;

//         // before we start, remove the baseURL setting:
//         before(function(done) {
// AD.log('... before()');
// AD.log('... sails.config: ', sails.config);
//             if (sails.config.appdev_gma) {
// AD.log('... found:  sails.config.appdev_gma');
//                 if (sails.config.appdev_gma.baseURL) {
// AD.log('... found:  sails.config.appdev_gma.baseURL');
//                     currSetting = sails.config.appdev_gma.baseURL;
//                     delete sails.config.appdev_gma.baseURL;
// AD.log('... after delete:',sails.config.appdev_gma );
//                 }
//             }
//             done();
//         });

//         // after we're done, return the setting:
//         after(function(done) {
//             if (sails.config.appdev_gma) {
//                 sails.config.appdev_gma.baseURL = currSetting;
//             }
//             done();
//         });


        // before we start, remove the baseURL setting:
        currSetting = sails.config.appdev_gma.baseURL;
        delete sails.config.appdev_gma.baseURL;

        GMA._authenticateProxy({ req: reqObj })
        .fail(function(err){
            assert.ok(true, ' --> should respond with an error. ');
            assert.include(err.message, 'INVALID_CONFIG', ' --> error.message included INVALID_CONFIG:');

            // after we're done, return the setting:
            sails.config.appdev_gma.baseURL = currSetting;
            done();
        })
        .done(function(data){
            assert.ok(false, ' --> should not have been called. ');
            done();
        });



    });




    it('calling ._authenticateProxy() with failing CAS.getProxyTicket() returns .reject() :',function(done){
        var originalObjects = GMA.____originalObjects();

        var cas = new mockCAS({ getProxyTicketSuccess:false });
        mockAD.reset();

        GMA.____mockObjects({ casService: cas, gmaAPI:mockGMAAPI, AD:mockAD });


        GMA._authenticateProxy({ req:reqObj})
        .fail(function(err){
            assert.ok(true, ' --> should respond with an error. ');
            assert.include(err.message, 'MockObject', ' --> error.message included MockObject:');

            // return the original objects
            GMA.____mockObjects(originalObjects);
            done();
        })
        .done(function(data){
            assert.ok(false, ' --> should not have been called. ');

            // return the original objects
            GMA.____mockObjects(originalObjects);
            done();
        })

    });




    it('calling ._authenticateProxy() with failing GMA.loginWithTicket() returns .reject() :',function(done){
        var originalObjects = GMA.____originalObjects();

        var originalGMAOptions = mockGMAAPI.options();
        mockGMAAPI.options({ loginCorrect:false });
        var cas = new mockCAS();
        mockAD.reset();

        GMA.____mockObjects({ casService: cas, gmaAPI:mockGMAAPI, AD:mockAD });


        GMA._authenticateProxy({ req:reqObj})
        .fail(function(err){
            assert.ok(true, ' --> should respond with an error. ');
            assert.include(err.message, 'MockObject', ' --> error.message included MockObject:');

            // return the original objects
            GMA.____mockObjects(originalObjects);
            mockGMAAPI.options(originalGMAOptions);
            done();
        })
        .done(function(data){
            assert.ok(false, ' --> should not have returned successfully. ');

            // return the original objects
            GMA.____mockObjects(originalObjects);
            mockGMAAPI.options(originalGMAOptions);
            done();
        })

    });




    it('calling ._authenticateProxy() on success should return an instance of our gma-api object :',function(done){
        var originalObjects = GMA.____originalObjects();

        var cas = new mockCAS();
        mockAD.reset();

        GMA.____mockObjects({ casService: cas, gmaAPI:mockGMAAPI, AD:mockAD, cachedConnections:{} });


        GMA._authenticateProxy({ req:reqObj})
        .fail(function(err){
            assert.ok(false, ' --> should not have been called. ');

            // return the original objects
            GMA.____mockObjects(originalObjects);
            done();
        })
        .done(function(gma){
            assert.ok(true, ' --> should complete successfully. ');
            assert.instanceOf(gma, mockGMAAPI, ' --> returned gma was an instance of our gma-api ');

            // return the original objects
            GMA.____mockObjects(originalObjects);
            done();
        })

    });




    it('calling ._authenticateProxy() on success should cache a connection :',function(done){
        var originalObjects = GMA.____originalObjects();

        var cas = new mockCAS();
        mockAD.reset();

        GMA.____mockObjects({ casService: cas, gmaAPI:mockGMAAPI, AD:mockAD, cachedConnections:{} });


        GMA._authenticateProxy({ req:reqObj})
        .fail(function(err){
            assert.ok(false, ' --> should not have been called. ');

            // return the original objects
            GMA.____mockObjects(originalObjects);
            done();
        })
        .done(function(gma){
            assert.ok(true, ' --> should complete successfully. ');

            // now get ahold of the cachedConnections and see if our GUID is present.
            var currentState = GMA.____originalObjects();
            assert.property(currentState.cachedConnections, 'test.guid', ' --> found a cached connection for out test user ');

            // return the original objects
            GMA.____mockObjects(originalObjects);
            done();
        })

    });




    it('calling ._authenticateProxy() should return a cached connection if one already exists :',function(done){
        var originalObjects = GMA.____originalObjects();

        var cas = new mockCAS();
        mockAD.reset();

        GMA.____mockObjects({ casService: cas, gmaAPI:mockGMAAPI, AD:mockAD, cachedConnections:{} });

        // the next gma reference will have key: 1st Connection
        mockGMAAPI.options({ key:'1stConnection'});


        GMA._authenticateProxy({ req:reqObj})
        .fail(function(err){
            assert.ok(false, ' --> should not have been called. ');

            // return the original objects
            GMA.____mockObjects(originalObjects);
            done();
        })
        .done(function(gma){
            // 1st step completed successfully.
            assert.ok(true, ' --> should complete successfully. ');
            assert.equal(gma.key, '1stConnection', ' --> our initial connection has our expected key');


            // now update key to return 2ndConnection on any newly created instaces:
            mockGMAAPI.options({ key:'2ndConnection'});

            // Calling _authenticate() again with our same credentials should return a gma object with 1stConnection as key:
            GMA._authenticateProxy({ req:reqObj})
            .fail(function(err){
                assert.ok(false, ' --> should not have been called. ');

                // return the original objects
                GMA.____mockObjects(originalObjects);
                done();
            })
            .done(function(gma){

                // now verify we received our 1st connection.
                assert.ok(true, ' --> should complete successfully. ');
                assert.equal(gma.key, '1stConnection', ' --> our initial connection has our expected key');


                // return the original objects
                GMA.____mockObjects(originalObjects);
                done();
            });
        })

    });







 });

