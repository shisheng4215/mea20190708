module.exports=function(grunt){
    //load module
    [
        'grunt-contrib-jshint',
        'grunt-link-checker',
    ].forEach(function(task){
        grunt.loadNpmTasks(task);
    });

    grunt.initConfig({
        jshint:{
            app:['meadowlark.js','public/js/**/*.js','lib/**/*.js'],
            qa:['Gruntfile.js','public/qa/**/*.js','qa/**/*.js'],
            },
        linkChecker:{
                dev:{
                    site:'localhost',
                    options:{
                        initialPort:3000
                    }              
                },

            }
    });

    grunt.registerTask('default',['jshint','linkChecker']);
};