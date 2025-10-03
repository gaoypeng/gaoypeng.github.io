/**
 * OBJLoader UMD wrapper for Three.js 0.150.0
 * Converted from ES6 module to work with browser globals
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('three')) :
	typeof define === 'function' && define.amd ? define(['exports', 'three'], factory) :
	(global = global || self, factory(global.THREE = global.THREE || {}, global.THREE));
}(this, (function (exports, THREE) { 'use strict';

	class OBJLoader extends THREE.Loader {

		constructor( manager ) {

			super( manager );

			this.materials = null;

		}

		load( url, onLoad, onProgress, onError ) {

			const scope = this;

			const loader = new THREE.FileLoader( this.manager );
			loader.setPath( this.path );
			loader.setRequestHeader( this.requestHeader );
			loader.setWithCredentials( this.withCredentials );
			loader.load( url, function ( text ) {

				try {

					onLoad( scope.parse( text ) );

				} catch ( e ) {

					if ( onError ) {

						onError( e );

					} else {

						console.error( e );

					}

					scope.manager.itemError( url );

				}

			}, onProgress, onError );

		}

		parse( text ) {

			const object = new THREE.Group();
			const state = {
				objects: [],
				object: {},
				vertices: [],
				normals: [],
				colors: [],
				uvs: [],
				materials: {},
				materialLibraries: []
			};

			const lines = text.split( '\n' );

			for ( let i = 0, l = lines.length; i < l; i ++ ) {

				const line = lines[ i ].trim();

				if ( line.length === 0 || line.charAt( 0 ) === '#' ) {
					continue;
				}

				const result = this._parseLineVertex( line, state );
				if ( result ) continue;

				const result2 = this._parseLineFace( line, state );
				if ( result2 ) continue;

				this._parseLineOther( line, state );

			}

			for ( let i = 0, l = state.objects.length; i < l; i ++ ) {

				const obj = state.objects[ i ];
				const geometry = obj.geometry;
				const materials = obj.materials;
				const isLine = ( geometry.type === 'Line' );

				if ( geometry.vertices.length === 0 ) continue;

				const buffergeometry = new THREE.BufferGeometry();
				buffergeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( geometry.vertices, 3 ) );

				if ( geometry.normals.length > 0 ) {
					buffergeometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( geometry.normals, 3 ) );
				}

				if ( geometry.colors.length > 0 ) {
					buffergeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( geometry.colors, 3 ) );
				}

				if ( geometry.uvs.length > 0 ) {
					buffergeometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( geometry.uvs, 2 ) );
				}

				const createdMaterials = [];
				for ( let mi = 0, miLen = materials.length; mi < miLen; mi ++ ) {

					const sourceMaterial = materials[ mi ];
					const material = state.materials[ sourceMaterial.name ];

					if ( ! material ) {
						const defaultMaterial = new THREE.MeshPhongMaterial();
						defaultMaterial.name = sourceMaterial.name;
						createdMaterials.push( defaultMaterial );
					} else {
						createdMaterials.push( material );
					}

				}

				let mesh;
				if ( createdMaterials.length > 1 ) {
					for ( let mi = 0, miLen = materials.length; mi < miLen; mi ++ ) {
						const sourceMaterial = materials[ mi ];
						buffergeometry.addGroup( sourceMaterial.groupStart, sourceMaterial.groupCount, mi );
					}

					const multiMaterial = createdMaterials;
					mesh = isLine ? new THREE.LineSegments( buffergeometry, multiMaterial ) : new THREE.Mesh( buffergeometry, multiMaterial );

				} else {
					mesh = isLine ? new THREE.LineSegments( buffergeometry, createdMaterials[ 0 ] ) : new THREE.Mesh( buffergeometry, createdMaterials[ 0 ] );
				}

				mesh.name = obj.name;
				object.add( mesh );

			}

			return object;

		}

		_parseLineVertex( line, state ) {

			const result = line.match( /^v\s+([\d\.\+\-eE]+)\s+([\d\.\+\-eE]+)\s+([\d\.\+\-eE]+)/ );

			if ( result ) {

				state.vertices.push(
					parseFloat( result[ 1 ] ),
					parseFloat( result[ 2 ] ),
					parseFloat( result[ 3 ] )
				);

				return true;

			}

			const result2 = line.match( /^vn\s+([\d\.\+\-eE]+)\s+([\d\.\+\-eE]+)\s+([\d\.\+\-eE]+)/ );

			if ( result2 ) {

				state.normals.push(
					parseFloat( result2[ 1 ] ),
					parseFloat( result2[ 2 ] ),
					parseFloat( result2[ 3 ] )
				);

				return true;

			}

			const result3 = line.match( /^vt\s+([\d\.\+\-eE]+)\s+([\d\.\+\-eE]+)/ );

			if ( result3 ) {

				state.uvs.push(
					parseFloat( result3[ 1 ] ),
					parseFloat( result3[ 2 ] )
				);

				return true;

			}

			return false;

		}

		_parseLineFace( line, state ) {

			const lineFirstChar = line.charAt( 0 );

			if ( lineFirstChar === 'f' ) {

				const vertices = line.match( /\s+(.+)/ );

				if ( vertices ) {

					const isQuad = vertices[ 1 ].split( /\s+/ ).length === 4;
					const faces = vertices[ 1 ].replace( /\s+/g, ' ' ).split( ' ' );

					if ( state.objects.length === 0 ) {

						this._parseLineObject( 'o untitled_object', state );

					}

					if ( state.object.geometry.type !== 'Mesh' ) {

						state.object.geometry = {
							type: 'Mesh',
							vertices: [],
							normals: [],
							colors: [],
							uvs: []
						};

					}

					const geometry = state.object.geometry;
					const materialNames = state.object.materials;

					if ( isQuad && faces.length === 4 ) {

						const face1 = [ faces[ 0 ], faces[ 1 ], faces[ 2 ] ];
						const face2 = [ faces[ 0 ], faces[ 2 ], faces[ 3 ] ];

						this._parseLineFaceVertex( face1, state, geometry, materialNames );
						this._parseLineFaceVertex( face2, state, geometry, materialNames );

					} else {

						this._parseLineFaceVertex( faces, state, geometry, materialNames );

					}

				}

				return true;

			}

			return false;

		}

		_parseLineFaceVertex( faces, state, geometry, materialNames ) {

			for ( let i = 0, l = faces.length; i < l; i ++ ) {

				const face = faces[ i ];

				if ( face === "" ) continue;

				const elements = face.split( '/' );

				const vertex = state.vertices[ ( parseInt( elements[ 0 ] ) - 1 ) * 3 ];
				const vertexY = state.vertices[ ( parseInt( elements[ 0 ] ) - 1 ) * 3 + 1 ];
				const vertexZ = state.vertices[ ( parseInt( elements[ 0 ] ) - 1 ) * 3 + 2 ];

				geometry.vertices.push( vertex, vertexY, vertexZ );

				if ( elements[ 1 ] !== "" && elements[ 1 ] !== undefined ) {

					const uv = state.uvs[ ( parseInt( elements[ 1 ] ) - 1 ) * 2 ];
					const uvY = state.uvs[ ( parseInt( elements[ 1 ] ) - 1 ) * 2 + 1 ];

					geometry.uvs.push( uv, uvY );

				}

				if ( elements[ 2 ] !== "" && elements[ 2 ] !== undefined ) {

					const normal = state.normals[ ( parseInt( elements[ 2 ] ) - 1 ) * 3 ];
					const normalY = state.normals[ ( parseInt( elements[ 2 ] ) - 1 ) * 3 + 1 ];
					const normalZ = state.normals[ ( parseInt( elements[ 2 ] ) - 1 ) * 3 + 2 ];

					geometry.normals.push( normal, normalY, normalZ );

				}

			}

		}

		_parseLineOther( line, state ) {

			const lineFirstChar = line.charAt( 0 );

			if ( lineFirstChar === 'o' ) {

				this._parseLineObject( line, state );

			} else if ( lineFirstChar === 'g' ) {

				this._parseLineGroup( line, state );

			} else if ( lineFirstChar === 'u' && line.split( ' ' )[ 0 ] === 'usemtl' ) {

				this._parseLineUsemtl( line, state );

			} else if ( lineFirstChar === 'm' && line.split( ' ' )[ 0 ] === 'mtllib' ) {

				this._parseLineMtllib( line, state );

			}

		}

		_parseLineObject( line, state ) {

			const name = line.substring( 2 ).trim();

			state.object = {
				name: name,
				fromDeclaration: true,
				geometry: {
					type: 'Mesh',
					vertices: [],
					normals: [],
					colors: [],
					uvs: []
				},
				materials: []
			};

			state.objects.push( state.object );

		}

		_parseLineGroup( line, state ) {

			// Implementation for group parsing would go here

		}

		_parseLineUsemtl( line, state ) {

			const name = line.substring( 7 ).trim();

			if ( state.object && typeof state.object.currentMaterial === 'function' ) {

				state.object.currentMaterial();

			}

			if ( state.object && state.object.materials.length === 0 ) {

				state.object.materials.push({
					name: name,
					smooth: true
				});

			} else {

				state.object.materials.push({
					name: name,
					smooth: state.object.materials[ state.object.materials.length - 1 ].smooth
				});

			}

			state.object.materials[ state.object.materials.length - 1 ].groupStart = state.object.geometry.vertices.length / 3;
			state.object.materials[ state.object.materials.length - 1 ].groupEnd = -1;
			state.object.materials[ state.object.materials.length - 1 ].groupCount = -1;

		}

		_parseLineMtllib( line, state ) {

			state.materialLibraries.push( line.substring( 7 ).trim() );

		}

	}

	// Make OBJLoader available on THREE namespace
	THREE.OBJLoader = OBJLoader;
	exports.OBJLoader = OBJLoader;

})));