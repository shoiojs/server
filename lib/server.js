const express = require('express')

let requestId = 0

class HttpServer {
    
    constructor( $module ) {
        this.$router = express.Router()
        this.$app = null
        this.$module = $module
        this.$router.use( (r, s, next) => {
            r.requestId = r.requestId || ++requestId
            console.log( '>', r.requestId, '[' +this.$module.$name+ ']', r.url )
            next()
        } )
    }

    listen() {
        this.$app = express()        
        this.$app.use( this.$router )
        this.$app.listen( ...arguments )
    }

    getRouter() { 
        return this.$router
    }

    useModule( $module ) {

        let path = '/'
        
        const options = $module.$options

        if( 'base' in options.router ) {
            path = options.router.base
        } 

        if( path[0] !== '/' ) {
            path = '/' + path
        }

        this.$router.use( path, $module.$server.getRouter() )
    }

    register( routes ) {

        const { $module } = this

        if( routes instanceof Array ) {
            for( let route of routes ) {
                this.register( route )
            }
            return
        }

        if( !routes.method ) {
            routes.method = 'get'
        }

        if( !routes.path ) {
            routes.path = '/'
        }

        if( routes.path[0] !== '/' ) {
            routes.path = '/' + routes.path
        }

        if( !routes.module ) {
            routes.module = $module.$name
        }

        this.$router[ routes.method ]( routes.path , async function( request, response ) {

            const payload = {
                ...routes,
                data: {
                    ...request.body,
                    ...request.query,
                    ...request.params
                }
            }

            const results = await $module.dispatch( payload )

            for( const result of results ) {
                response.send( result )
            }

            response.end()

        } )
        

    }

}

module.exports = function ModuleServer( ) {


    function extend( a ){

        a.prototype.$http = HttpServer

        a.prototype.$server = null

        a.prototype.$router = null

    }

    function mount(){

        this.$server = new this.$http( this )

        for( const $module of this.$modules ){
            this.$server.useModule( $module )
        }

        if( this.$options.router ) {
            if( 'port' in this.$options.router ) {
                this.$server.listen( this.$options.router.port )
            }

            if( 'routes' in this.$options.router ) {
                this.$server.register( this.$options.router.routes )
            }
        }

    }

    return {
        $mount: mount,
        $extend: extend
    }

}