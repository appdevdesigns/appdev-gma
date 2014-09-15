
var path = require('path');
var fs = require('fs');
var AD = require('ad-utils');
var async = require('async');


var CAS = function(options) {

    this.data={
        
    };




    this.options = AD.sal.extend({}, { getProxyTicketSuccess:true, }, options);


}



module.exports = CAS;






//-----------------------------------------------------------------------------
// gma-api methods
//-----------------------------------------------------------------------------


CAS.prototype.getProxyTicket = function( req, url ) {
    var dfd = AD.sal.Deferred();

    if (this.options.getProxyTicketSuccess) {
        dfd.resolve();
    } else {
        dfd.reject(new Error('MockObject: failure getting proxy ticket.'));
    }


    return dfd;
}