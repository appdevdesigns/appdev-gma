/**
 * appdev-gma
 *
 * Configuration settings for the GMA server we connect to.
 *
 */

module.exports.appdev_gma = {

    // url 
    // The url of your GMA server instance.
    baseURL:'https://example.url.here/',	// for the love ... don't forget the final '/'!


    // user
    // When our GMA services request information about other people, we need to use an account
    // to login as.  
    // This account in GMA needs to have AAAAA  and   BBBB priviledges assigned to it.
    //
    // *** Don't actually store your info here, use the config/local.js file to do that.
    user: {
    	id:'login.id',
    	pass:'pass.word'
    }
  
};