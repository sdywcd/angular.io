var fs = require('fs');
var path = require('canonical-path');
var Package = require('dgeni').Package;
var basePackage = require('../docs-package');
var targetPackage = require('../target-package');
var cheatsheetPackage = require('../cheatsheet-package');

var PROJECT_PATH = path.resolve(__dirname, "../../..");
var PUBLIC_PATH = path.resolve(PROJECT_PATH, 'public');
var DOCS_PATH = path.resolve(PUBLIC_PATH, 'docs');
var ANGULAR2_DOCS_PATH = path.resolve(__dirname, '../../../../angular/modules/@angular/docs');


module.exports = new Package('angular.io', [basePackage, targetPackage, cheatsheetPackage])

.factory(require('./services/renderMarkdown'))
.processor(require('./processors/addJadeDataDocsProcessor'))
.processor(require('./processors/matchUpDirectiveDecorators'))
.processor(require('./processors/filterMemberDocs'))

// overrides base packageInfo and returns the one for the 'angular/angular' repo.
.factory(require('./services/packageInfo'))

// Configure rendering
.config(function(templateFinder, templateEngine, renderDocsProcessor) {

  templateFinder.templateFolders
      .unshift(path.resolve(__dirname, 'templates'));

  // helpers are made available to the nunjucks templates
  renderDocsProcessor.helpers.relativePath = function(from, to) {
    return path.relative(from, to);
  };
})

.config(function(parseTagsProcessor, getInjectables) {
  parseTagsProcessor.tagDefinitions = parseTagsProcessor.tagDefinitions.concat(getInjectables(require('./tag-defs')));
})

.config(function(readTypeScriptModules, writeFilesProcessor, readFilesProcessor) {

  var angular_repo_path =  path.resolve(__dirname, '../../../../angular');
  // confirm that the angular repo is actually there.
  if (!fs.existsSync(angular_repo_path)) {
    throw new Error('build-api-docs task requires the angular repo to be at ' + angular_repo_path);
  }
  readTypeScriptModules.basePath = path.resolve(angular_repo_path, 'modules');
  readTypeScriptModules.ignoreExportsMatching = [/^_/];

  readTypeScriptModules.sourceFiles = [
    '@angular/common/index.ts',
    '@angular/common/testing/index.ts',
    '@angular/core/index.ts',
    '@angular/core/testing/index.ts',
    '@angular/forms/index.ts',
    '@angular/http/index.ts',
    '@angular/http/testing/index.ts',
    '@angular/platform-browser/index.ts',
    '@angular/platform-browser/testing/index.ts',
    '@angular/platform-browser-dynamic/index.ts',
    '@angular/platform-browser-dynamic/testing/index.ts',
    '@angular/platform-server/index.ts',
    '@angular/platform-server/testing/index.ts',
    '@angular/platform-webworker/index.ts',
    '@angular/platform-webworker-dynamic/index.ts',
    '@angular/router/index.ts',
    '@angular/router/testing/index.ts',
    '@angular/upgrade/index.ts',
  ];
  readTypeScriptModules.hidePrivateMembers = true;


  readFilesProcessor.basePath = DOCS_PATH;
  readFilesProcessor.sourceFiles = [{
    basePath: ANGULAR2_DOCS_PATH,
    include: path.resolve(ANGULAR2_DOCS_PATH, 'cheatsheet/*.md')
  }];
})

.config(function(getLinkInfo) {
  getLinkInfo.useFirstAmbiguousLink = false;
})


.config(function(readFilesProcessor, generateNavigationDoc) {
  // Clear out unwanted processors
  generateNavigationDoc.$enabled = false;
})


.config(function(computeIdsProcessor, computePathsProcessor, EXPORT_DOC_TYPES) {

  computePathsProcessor.pathTemplates.push({
    docTypes: ['module'],
    getPath: function computeModulePath(doc) {
      doc.moduleFolder = doc.id.replace(/^@angular\//, '');
      return doc.moduleFolder + '/index.html';
    },
    getOutputPath: function computeModulePath(doc) {
      return doc.moduleFolder + '/index.jade';
    }
  });

  computePathsProcessor.pathTemplates.push({
    docTypes: EXPORT_DOC_TYPES,
    pathTemplate: '${moduleDoc.moduleFolder}/${name}-${docType}.html',
    outputPathTemplate:'${moduleDoc.moduleFolder}/${name}-${docType}.jade',
  });


  computePathsProcessor.pathTemplates.push({
    docTypes: ['decorator'],
    pathTemplate: '${moduleDoc.moduleFolder}/${name}-${docType}.html',
    outputPathTemplate:'${moduleDoc.moduleFolder}/${name}-${docType}.jade',
  });

  computePathsProcessor.pathTemplates.push({
    docTypes: ['jade-data'],
    pathTemplate: '${originalDoc.moduleFolder}/_data',
    outputPathTemplate: '${path}.json'
  });

  computePathsProcessor.pathTemplates.push({
    docTypes: ['api-list-data'],
    pathTemplate: 'api-list.json',
    outputPathTemplate: '${path}'
  });

  computePathsProcessor.pathTemplates.push({
    docTypes: ['api-list-audit'],
    pathTemplate: 'api-list-audit.json',
    outputPathTemplate: '${path}'
  });

  computePathsProcessor.pathTemplates.push({
    docTypes: ['cheatsheet-data'],
    pathTemplate: '../guide/cheatsheet.json',
    outputPathTemplate: '${path}'
  });
})

.config(function(getLinkInfo) {
  getLinkInfo.relativeLinks = true;
})


.config(function(templateEngine, getInjectables) {
  templateEngine.filters = templateEngine.filters.concat(getInjectables([
    require('./rendering/trimBlankLines'),
    require('./rendering/toId'),
    require('./rendering/indentForMarkdown')
  ]));
});
