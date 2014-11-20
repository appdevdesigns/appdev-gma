var path = require('path');




//-----------------------------------------------------------------------------
// Variables:
//-----------------------------------------------------------------------------
var AD = require('ad-utils');       // reusable AD utilities (log, sal, etc...)
var gmaAPI = require('gma-api');    // the gma-api communications library 
var casService = null;              // the /api/services/CAS.js library
var adCore = null;                  // the base appdev resources libaray


var cachedConnections = {};          // a hash of { guid : {gma connection}}
var cachedData  = {};                // a hash of { guid : { assignments:{ id: {assignment}}}}




module.exports= {

        /*
         *  @function _init
         *
         *  function called during the bootstrap.js process in order to setup
         *  variables that are not available when this file is initially read.
         */
        _init:function() {
            AD.log('... <green><bold>GMA._init()</bold></green>');
            casService = CAS;   // now available
            adCore = ADCore;    
        },



        /*
         *  @function ____mockObjects
         *
         *  Allow our unit tests to send in Mock cas & gma objects to return
         *  predetermined values.
         */
        ____mockObjects:function(opt) {


            if (opt.casService) {
                casService = opt.casService;
            }

            if (opt.gmaAPI) {
                gmaAPI = opt.gmaAPI;
            }

            if (opt.AD) {
                AD = opt.AD;
            }

            if (opt.cachedConnections) {
                cachedConnections = opt.cachedConnections;
            }
        },



        /*
         *  @function ____originalObjects
         *
         *  Allow our unit tests to retrieve the original objects that are 
         *  in use.  So they can reset them to the proper values when they
         *  are done.
         */
        ____originalObjects:function() {


            return {
                casService:casService,
                gmaAPI:gmaAPI,
                AD:AD,
                cachedConnections:cachedConnections
            }

        },




        /**
         *  @function _authenticateProxy
         *
         *  Authenticate the current user using proxy authentication.
         *
         *  
         *
         *  @return {object} a gma-api instance. 
         */
        _authenticateProxy:function( options ) {
            var dfd = AD.sal.Deferred();


            // no options == reject()!
            if (typeof options == 'undefined') {
                dfd.reject(new Error('INVALID_PARAMS: invalid parameters provided to _authenticateProxy()'));
                return dfd;
            }


            // no options.req == reject()
            if (typeof options.req == 'undefined') {
                dfd.reject(new Error('INVALID_PARAMS: missing REQ in call to _authenticateProxy()'));
                return dfd;
            }
            var req = options.req;


            // if our GMA settings are not set == reject()
            if (typeof sails.config.appdev_gma == 'undefined' ) {
                dfd.reject(new Error('INVALID_CONFIG: missing definition for sails.config.appdev_gma.  Check your config/local.js'));
                return dfd;
            }
            if (typeof sails.config.appdev_gma.baseURL == 'undefined' ) {
                dfd.reject(new Error('INVALID_CONFIG: missing definition for appdev_gma.baseURL.  Check your config/local.js'));
                return dfd;
            }


            // once we start caching connections
            // look for a cached connection for this user 
            // if found, then return that one
            var userGUID = ADCore.user.current(req).GUID();
            if (cachedConnections[userGUID]) {
                dfd.resolve(cachedConnections[userGUID]);
                return dfd;
            }




            // looks like we need to create a new connection
            var gma = new gmaAPI({
                gmaBase: sails.config.appdev_gma.baseURL,    // 'http://gma.zteam.biz/',
                //casURL: 'not needed when using the proxy’,
                log: AD.log
            });

            AD.log('... getting CAS proxyTicket:');
            casService.getProxyTicket(req, gma.gmaHome)
            .fail(function(err){
                    AD.log.error(' error getting proxy ticket:', err);
                    err.service_message = 'error getting proxy ticket';
                    dfd.reject(err);
            })
            .done(function(ticket) {

                AD.log('... ticket:'+ticket);

                gma.loginWithTicket(ticket)
                .fail(function(err){
                    AD.log.error(' error logging in using ticket:', err);
                    err.service_message = 'error logging into gma using ticket:'+ticket;
                    dfd.reject(err);
                })
                .done(function(){
                    
                    cachedConnections[userGUID] = gma;

                    dfd.resolve(gma);
                });

            });


            return dfd;
        },



        /**
         *  @function _clearCache
         *
         *  remove all the cache entries for given guid
         *
         *  @return {undefined]}
         */
        _clearCache: function( guid ) {

            delete cachedConnections[guid];
            delete cachedData[guid];

        },



        /**
         *  @function assignmentsForRequest
         *
         *  Return an array of assignments for the currently authenticated user.
         *
         *  GMA is authenticated using CAS.  The current user session of the
         *  provided request object also needs to have been authenticated using
         *  CAS.
         *
         *  The array of returned objects will be instances of gma-api Assignment 
         *  objects: 
         *
         *      { nodeId:X,  shortName:'yyyyyy',  role:'zzzz' }
         *
         *  @return [array] 
         */
        assignmentsForRequest:function( options ) {
            var dfd = AD.sal.Deferred();
            var self = this;

            // check for options
            if (typeof options == 'undefined') {
                dfd.reject(new Error('INVALID_PARAMS: invalid parameters provided to assignmentsForRequest()'));
                return dfd;
            }


            // no options.req == reject()
            if (typeof options.req == 'undefined') {
                dfd.reject(new Error('INVALID_PARAMS: missing REQ in call to assignmentsForRequest()'));
                return dfd;
            }
            var req = options.req;


            var finalResults = [];
            var gmaConnection = null;

            var role = 'staff';

            async.series([

                // step 1: authenticate
                function(next) {

                    GMA._authenticateProxy({ req: req})
                    .fail(function(err){
                        next(err);
                    })
                    .done(function(gma){
                        gmaConnection = gma;
                        next();

                    });
                },

                // step 2: get assignments
                function(next) {

                    gmaConnection.getAssignments(role)
                    .fail(function(err){
//// TODO:
// check for Authentication error here:
// if so, remove cached gma entry,
// then call this again and return the results

                        var userGUID = ADCore.user.current(req).GUID();
                        if (typeof options.authRetry == 'undefined') {

                            // remove cached connection
                            GMA._clearCache(userGUID);
                            
                            // try this again:
                            options.authRetry = true;
                            GMA.assignmentsForRequest(options)
                            .fail(function(err){
                                next(err);
                            })
                            .done(function(data){

                                finalResults = data;
                                next(null, data);
                            })

                        } else {
                            next(err);
                        }

                        
                    })
                    .done(function(dataByID, dataByName, listAssignments){

                        finalResults = listAssignments;
                        next(null, listAssignments);
                    })

                }

            ], function(err, results){

                if (err) {
                    dfd.reject(err);
                } else {
                    dfd.resolve(finalResults);
                }

            });

            return dfd;
        },




        /**
         *  @function measurementsForRequest
         *
         *  Return an array of measurements for the currently authenticated 
         *  user.
         *
         *  GMA is authenticated using CAS.  The current user session of the
         *  provided request object also needs to have been authenticated using
         *  CAS.
         *
         *  @param {integer}  nodeId    The node/assignment id to gather 
         *                              measurements for.
         *
         *  The array of returned objects will be instances of gma-api Measurement 
         *  objects: 
         *
         *      { 
         *          gma:{gmaConnection},
         *          report:{reportObj},
         *          data:{ 
         *              reportId:1, 
         *              measurementId:Id1, 
         *              measurementName:'name1', 
         *              measurementDescription:'desc1', 
         *              measurementValue:val1, 
         *              role:'staff'
         *          }
         *      },
         *
         *  @return [array] 
         */
        measurementsForRequest:function( options ) {
            var dfd = AD.sal.Deferred();
            var self = this;

            // check for options
            if (typeof options == 'undefined') {
                dfd.reject(new Error('INVALID_PARAMS: invalid parameters provided to measurementsForRequest()'));
                return dfd;
            }


            // no options.req == reject()
            if (typeof options.req == 'undefined') {
                dfd.reject(new Error('INVALID_PARAMS: missing REQ in call to measurementsForRequest()'));
                return dfd;
            }
            var req = options.req;


            // no options.nodeId == reject()
            if (typeof options.nodeId == 'undefined') {
                dfd.reject(new Error('INVALID_PARAMS: missing nodeId in call to measurementsForRequest()'));
                return dfd;
            }
            var nodeId = options.nodeId;


            var finalResults = [];
            var listAssignments = null;
            var assignment = null;

            var role = 'staff';

            async.series([

                // step 1: get assignments for this user
                function(next) {

                    GMA.assignmentsForRequest({ req: req})
                    .fail(function(err){
                        next(err);
                    })
                    .done(function(data){
                        listAssignments = data;
                        next();

                    });
                },



                // step 2: get assignment for nodeId
                function(next) {


                    // look for the assignment with the given nodeId
                    listAssignments.forEach(function(entry) {
                        if (entry.nodeId == nodeId) {
                            assignment = entry;
                        }
                    });


                    // if found continue
                    if (assignment) {
                        next();

                    // else error
                    } else {

                        var err = new Error('NOT_FOUND: User is not assigned to an assignment with nodeId:'+nodeId);
                        next(err);

                    }

                }, 


                // step 3:  get measurements for Assignment
                function(next) {

                    // if cached measurements for nodeId, return those

                    // else

                        // if assignment found,
                        if (assignment) {

                            // request measurements from assignment
                            assignment.getMeasurements()
                            .fail(function(err){
                                next(err);
                            })
                            .done(function(list){

                                // return measurements
                                finalResults = list;
                                next();
                            })
                            
                        }

                        // else return error

                },
                
                
                // step 4: get LMI placements for measurements
                function(next) {
                    // Skip this step if GMAMatrix placement model is not loaded
                    if (typeof Placement == 'undefined') next();
                
                    // Create a flat hash of measurement object references
                    // for finalResults.
                    var measurements = {};
                    var IDs = [];
                    for (var strategy in finalResults) {
                        for (var i=0; i<finalResults[strategy].length; i++) {
                            var m = finalResults[strategy][i];
                            measurements[ m.id() ] = m;
                            IDs.push( m.id() );
                        }
                    }
                    
                    // Look up the GMAMatrix LMI placements and package them
                    // into the final results.
                    Placement.find({ measurement_id: IDs })
                    .then(function(list){
                        for (var i=0; i<list.length; i++) {
                            var placement = list[i];
                            var id = placement.measurement_id;
                            // Adding the LMI data here will also affect the
                            // measurement objects in `finalResults`
                            measurements[ measurementID ].data.lmi = placement.location;
                        }
                        next();
                    })
                    .fail(function(err){
                        next(err);
                    })
                    .done();
                    
                }
            
            ], function(err, results){

                if (err) {
                    dfd.reject(err);
                } else {
                    dfd.resolve(finalResults);
                }

            });

            return dfd;
        },




        /**
         *  @function graphDataForRequest
         *
         *  Return an array of historical values for requested measurements.
         *
         *  GMA is authenticated using CAS.  The current user session of the
         *  provided request object also needs to have been authenticated using
         *  CAS.
         *
         *  @param {integer}  nodeId    The node/assignment id to gather 
         *                              measurements for.
         *  @param {array} measurements An array of measurementIds to 
         *                              return graph data for.
         *  
         *
 *  The array of returned objects will be instances of gma-api Measurement 
 *  objects: 
 *
 *      { 
 *          gma:{gmaConnection},
 *          report:{reportObj},
 *          data:{ 
 *              reportId:1, 
 *              measurementId:Id1, 
 *              measurementName:'name1', 
 *              measurementDescription:'desc1', 
 *              measurementValue:val1, 
 *              role:'staff'
 *          }
 *      },
         *
         *  @return [array] 
         */
        graphDataForRequest: function(options) {
            var dfd = AD.sal.Deferred();

            // check for options
            if (typeof options == 'undefined') {
                dfd.reject(new Error('INVALID_PARAMS: invalid parameters provided to graphDataForRequest()'));
                return dfd;
            }


            // no options.req == reject()
            if (typeof options.req == 'undefined') {
                dfd.reject(new Error('INVALID_PARAMS: missing REQ in call to graphDataForRequest()'));
                return dfd;
            }
            var req = options.req;


            // no options.nodeId == reject()
            if (typeof options.nodeId == 'undefined') {
                dfd.reject(new Error('INVALID_PARAMS: missing nodeId in call to graphDataForRequest()'));
                return dfd;
            }
            var nodeId = options.nodeId;


//// Question:  do we allow for measurements to be optional?  Default = look up Assignment by nodeId and return all measurements.
            // measurements are required!
            var measurements = options.measurements || null;
            // if (measurements == null) {
            //     dfd.reject(new Error('INVALID_PARAMS: missing measurements[] in call to GMA.graphDataForRequest()'));
            //     return dfd;
            // }
            // if (measurements.length == 0) {
            //     dfd.reject(new Error('WHY_BOTHER: [GMA.graphDataForRequest()] you actually need to provide some measurement ids to get anything back.'));
            //     return dfd;
            // }



            var finalResults = [];      // this is what I'm actually sending back
            var gmaConnection = null;   // the gma connection object to use in requesting info

            async.series([

                // step 1: get a gmaConnection to use:
                function(next) {
                    AD.log('... getting gmaConnection to use');
                    GMA._authenticateProxy({ req: req})
                    .fail(function(err){
                        AD.log.error(' failed to get connection!');
                        next(err);
                    })
                    .done(function(gma){
                        gmaConnection = gma;
                        next();
                    });
                },

                // step 2: make the call!
                function(next){
                    AD.log('... calling gmaConnection.getGraphData()');
                    gmaConnection.getGraphData({
                        nodeId: nodeId,
                        measurements:measurements,
                        startDate: options.startDate,
                        endDate: options.endDate,
                        language:'en'

                    })
                    .fail(function(err){
                        AD.log.error(' failed getGraphData()');
                        next(err);
                    })
                    .done(function(list){
                        finalResults = list;
                        next();
                    })
                }

            ], function(err, results){

                if (err) {
                    dfd.reject(err);
                } else {
// dfd.reject(new Error('just a stub!'));
                    dfd.resolve(finalResults);
                }
            })


            return dfd;
        }



/**
 * This service fetches measurement values of an organization over several 
 * reporting intervals.
 *
 * @param {HttpRequest} req
 *      This needs to contain the user's GMA CAS cookie jar.
 * @param {Integer} nodeID
 *      The organization ID values.
 * @param {String} strategyName
 *      The name of the strategy/MCC exactly as it appears in GMA.
 *      Optionally, you may specify this as an {Integer} if you already know
 *      the exact strategy_id value.
 * @param {String} startDate
 *      YYYYMMDD
 * @param {String} endDate
 *      YYYYMMDD
 * @param {Array} measurements
 *      An array of measurement_id values.
 * @param {Integer} languageID
 *      (Optional) -1 for English. 
 *      Default is to use the user's default GMA language.
 * @return {Deferred}
 */
// var getGraphData = function(req, nodeID, strategyName, startDate, endDate, measurements, languageID) {
//     var dfd = $.Deferred();

//     // This is the JSON options object to be sent to GMA
//     var serviceOptions = {
//         dateRange: {
//             fixed: {
//                 from: startDate,
//                 to: endDate
//             }
//         },
//         reportFormat: { 
//             byReportingInterval: {
//                 showTotalColumn: false,
//                 granularity: 2 // monthly
//             }
//         },
//         organizationSelection: [ nodeID ],
//         strategySelection: [/* to be determined */],
//         measurementSelection: {
//             calculatedList: [],
//             numericList: measurements
//         }
//     };

    
//     if (!languageID) {
//         langOption = '';
//     }
//     else if (languageID == -1) {
//         langOption = '&languageId=' + langEN;
//     }
//     else {
//         langOption = '&languageId=' + languageID;
//     }
    
//     // Parse the strategy name/ID
//     if (typeof strategyName == 'number') {
//         // Strategy ID was given directly.
//         var strategyID = strategyName;
//         var strategyDFD = $.Deferred();
//         strategyDFD.resolve(strategyID);
//     }
//     else {
//         // Strategy name given, but not the ID.
//         // Look it up first.
//         var strategyDFD = getStrategyID(req, nodeID, strategyName);
//     }
    
//     // The strategy ID is needed by the web service to produce the graph 
//     // data.
//     strategyDFD.then(function(strategyID) {
//         serviceOptions.strategySelection = [strategyID];
        
//         log(req, 'gmaAdvancedReport Service Options:');
//         log(req, serviceOptions);
    
//         // GMA Web Service 4.7.2 Advanced Report Generate
//         AD.Comm.HTTP.request({
//             method: 'POST',
//             url: AD.GMA.baseURL + '?q=en/gmaservices/gma_advancedReport/' + nodeID 
//                    + '/generate' + langOption,
//             jar: req.session['gmaClient-jar'],
//             json: serviceOptions
//         })
//         .then(function(res) {
//             // Unrecognized JSON response
//             if (!res) {
//                 log(req, res);
//                 dfd.reject(new Error("Unrecognized JSON response from GMA"));
//                 return;
//             }
//             // Valid JSON response that tells us the request failed
//             if (!res.success || res.success == 'false') {
//                 // `success` == false
//                 log(req, 'gmaAdvanceReport failed');
//                 log(req, res);
//                 dfd.reject(new Error("gmaAdvanceReport failed"));
//                 return;
//             }
//             // Sometimes gmaAdvancedReport returns no data
//             if (!res.data) {
//                 log(req, 'gmaAdvancedReport returned no data');
//                 log(res);
//                 dfd.reject(new Error("GMA returned no data"));
//                 return;
//             }
            
//             // Successful request response. Parse it now.
//             parseXML(null, res.data)
//                 .then(function(parsedData) {
//                     dfd.resolve(parsedData);
//                 })
//                 .fail(function(err) {
//                     log(req, 'gmaAdvancedReport parse error');
//                     log(req, res.data);
//                     log(req, err);
//                     dfd.reject(new Error("XML parse error"));
//                 });
//             return;
//         })
//         .fail(function(err) {
//             // Badly formed results
//             log(req, err);
//             dfd.reject(err);
//         });
    
//     }); // end of strategyDFD.then()
    
//     // Could not get the strategy ID from GMA
//     strategyDFD.fail(function(err) {
//         log(req, "Could not obtain strategy_id from GMA");
//         log(req, err);
//         dfd.reject(err);
//     });
    
//     return dfd;
// }




}


