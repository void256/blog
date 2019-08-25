///////////////////////////////////////////////////////////////////////////////
// TileMapLayer
///////////////////////////////////////////////////////////////////////////////

function TileMapLayer(visibleMapWidth, visibleMapHeight, tileSize, layer, tileMap) {
	this.visibleMapWidth = visibleMapWidth;
	this.visibleMapHeight = visibleMapHeight;
	this.tileSize = tileSize;
	this.layer = layer;
	this.tileMap = tileMap;
	this.layerContent = this.layer.data.slice(0);
	this.tileData = new Float32Array(visibleMapWidth * visibleMapHeight * 4 * 2);
	this.tileSubData = new Float32Array(1 * 1 * 4 * 2);
	this.tileBuffer = gl.createBuffer();
	this.scrollPos = 0;
	this.tileMapXPos = 0;
	this.tileMapXPosOld = -1;
	this.tileMapXPosChanged = true;
	this.tileHack = 1;
	this.framecounter = 0;
	this.isOverlay = this.layer.properties ? this.layer.properties["type"] == "overlay" : false;
	this.isVisible = this.layer.visible;
	this.autoScrollPos = 0;
	this.animateTiles = [];

	gl.bindBuffer(gl.ARRAY_BUFFER, this.tileBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, this.tileData, gl.STREAM_DRAW);

	this.layerProperty = function(name) {
		if (this.layer.properties) {
			return this.layer.properties[name];
		}
		return null;
	}

	this.tile = function(x, y) {
		var mapIndex = y * this.layer.width + this.tileMapXPos + x;
		if (mapIndex > this.layerContent.length) {
			return 0;
		}
		return this.layerContent[mapIndex];
	}

	this.moveTileMap = function(amount) {
		var speed = this.layerProperty("speed");
		var scrollPos = amount / (speed ? Number(speed) : 1);

		this.scrollPos = -Math.floor(scrollPos % 16);
		this.tileMapXPos = Math.floor(scrollPos / 16);
		this.tileMapXPosChanged = false;
		if (this.tileMapXPos != this.tileMapXPosOld) {
			this.tileMapXPosOld = this.tileMapXPos;
			this.tileMapXPosChanged = true;
		}
	}

	this.updateSingleTile = function(gx, gy, tileIndex) {
		// update tilemap in memory
		var mapIndex = gy * this.layer.width + gx;
		this.layerContent[mapIndex] = tileIndex;

		this.updateSingleTileOnScreen(gx, gy, tileIndex);
	}

	this.updateSingleTileOnScreen = function(gx, gy, tileIndex) {
		// update map on screen (if tile is visible)
		var x = gx - this.tileMapXPos;
		if (x >= 0 && x < this.visibleMapWidth) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.tileBuffer);
			var targetIndex;
			if (tileIndex == 0) {
				targetIndex = tileIndex;
			} else {
				targetIndex = tileIndex - 1;
			}
			this.addTileToBuffer(targetIndex, 0, this.tileSubData);
			gl.bufferSubData(gl.ARRAY_BUFFER, (gy * this.visibleMapWidth + x) * 4 * 2 * 4, this.tileSubData);
		}
	}

	this.handleAutoScroll = function() {
		var autoScroll = this.layerProperty("autoScroll");
		if (!autoScroll) {
			return;
		}
		this.autoScrollPos += Number(autoScroll);
		if (this.autoScrollPos >= (this.layer.width * this.tileSize * 2)) {
			this.autoScrollPos = 0;
		}
		this.moveTileMap(this.autoScrollPos);
	}

	this.tileAnimation = function() {
		if (!this.animateTiles) {
			return;
		}
		if (this.animateTiles.length == 0) {
			return;
		}
		for (t=0; t<this.animateTiles.length; t++) {
			var animateTileInfo = this.animateTiles[t];
			var tileIndex = this.tile(animateTileInfo.x - this.tileMapXPos , animateTileInfo.y);
			var tileProps = this.tileMap.tileProperties(tileIndex);
			if (tileProps) {
				if (tileProps["type"] == "bonus") {
					this.updateSingleTileOnScreen(animateTileInfo.x, animateTileInfo.y, animateTileInfo.tileIndex + this.tileMap.bonusTileAnimation.index);
				} else if (tileProps["type"] == "gem") {
					this.updateSingleTileOnScreen(animateTileInfo.x, animateTileInfo.y, animateTileInfo.tileIndex + this.tileMap.gemTileAnimation.index);
				}
			}
		}
	}

	this.updateTileMap = function() {
		this.handleAutoScroll();
		if (!this.tileMapXPosChanged) {
			this.tileAnimation();
			return;
		}

		this.tileMapXPosChanged = false;
		this.animateTiles.length = 0;
		var pos = 0;
		for (y = 0; y < this.visibleMapHeight; y++) {
			for (x = 0; x < this.visibleMapWidth; x++) {
				var tileIndex = this.tile(x, y);
				var tileProps = this.tileMap.tileProperties(tileIndex);
				if (tileProps) {
					if (tileProps["type"] == "bonus") {
						var animateTileInfo = {
							x: x + this.tileMapXPos,
							y: y,
							tileIndex: 2
						};
						this.animateTiles.push(animateTileInfo);
					} else if (tileProps["type"] == "gem") {
						if (tileProps["animateTileIndex"]) {
							var animateTileInfo = {
								x: x + this.tileMapXPos,
								y: y,
								tileIndex: Number(tileProps["animateTileIndex"])
							};
							this.animateTiles.push(animateTileInfo);
						}
					}
				}

				var bufferIndex = 0;
				if (tileIndex == 0) {
					bufferIndex = 0;
				} else {
					bufferIndex = tileIndex - 1;
				}
				pos = this.addTileToBuffer(bufferIndex, pos, this.tileData);
			}
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.tileBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.tileData, gl.STREAM_DRAW);
		this.tileAnimation();
	}

	this.addTileToBuffer = function(aTile, pos, target) {
		var aTileX = Math.floor(aTile % (textureWidth / this.tileSize));
		var aTileY = Math.floor(aTile / (textureHeight / this.tileSize / 2)); // /2 since we only use half of the texture

		var tileX0 = aTileX * this.tileSize;
		var tileY0 = aTileY * this.tileSize;
		var tileX1 = aTileX * this.tileSize + this.tileSize - 1;
		var tileY1 = aTileY * this.tileSize + this.tileSize - 1;

		var u0 = (0.5 / textureWidth) + (tileX0 / textureWidth);
		var v0 = (0.5 / textureHeight) + (tileY0 / textureHeight);
		var u1 = (0.5 / textureWidth) + (tileX1 / textureWidth);
		var v1 = (0.5 / textureHeight) + (tileY1 / textureHeight);
	
		target[pos++] = u0;
		target[pos++] = v0;

		target[pos++] = u1;
		target[pos++] = v0;

		target[pos++] = u1;
		target[pos++] = v1;

		target[pos++] = u0;
		target[pos++] = v1;
		return pos;
	}


	this.draw = function(shader, overlay) {
		if (!this.isVisible) {
			return;
		}
		if (overlay) {
			if (!this.isOverlay) {
				return;
			}
		} else {
			if (this.isOverlay) {
				return;
			}
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, this.tileBuffer);
		gl.vertexAttribPointer(shader.attribute("aTexture"), 2, gl.FLOAT, false, 2 * 4, 0);
		gl.uniform2fv(shader.uniform("pos"), [this.scrollPos, 0]);
		gl.drawElements(gl.TRIANGLES, 6 * this.visibleMapWidth * this.visibleMapHeight, gl.UNSIGNED_SHORT, 0);
	}
}

///////////////////////////////////////////////////////////////////////////////
// TileAnimation
///////////////////////////////////////////////////////////////////////////////
function TileAnimation(speed, count, pingPong) {
	this.frameCounter = speed;
	this.index = 0;
	this.dir = 1;

	this.update = function() {
		this.frameCounter -= 1;
		if (this.frameCounter < 0) {
			this.frameCounter = speed;

			this.index += this.dir;
			if (this.index >= count - 1) {
				if (pingPong) {
					this.dir = -this.dir;
				} else {
					this.index = 0;
				}
			} else if (this.index <= 0) {
				this.dir = -this.dir;
			}
		}
	}
}

///////////////////////////////////////////////////////////////////////////////
// TileMap
///////////////////////////////////////////////////////////////////////////////

function TileMap(shader, game, level, font, introMessageDoneCallback) {
	this.shader = shader;
	this.game = game;
	this.levelData = level;
	this.font = font;
	this.tileSize = this.levelData.tilewidth;
	this.isCutScene = this.levelData.properties["isCutScene"] == "true";
	this.stageName = this.levelData.properties["stageName"];
	this.playerStartMessage = this.levelData.properties["playerStartMessage"];
	this.bonusTileAnimation = new TileAnimation(10, 5, true);
	this.gemTileAnimation = new TileAnimation(10, 8, false);
	this.startMessages = getMessages(this.levelData);
	this.startMessage = null;
	if (this.startMessages) {
		this.startMessage = new TextOut(this.font, this.startMessages.messageArray, introMessageDoneCallback, this.startMessages.posX, this.startMessages.posY, true);
	}

	function getMessages(level) {
		if (level.properties) {
			var startMessage = level.properties["startMessage"];
			if (startMessage) {
				var result = new Object();
				result.messageArray = startMessage.split("#");
				result.posX = 8;
				result.posY = 10;

				var position = level.properties["startMessagePosition"];
				if (position) {
					if (position == "bottom") {
						result.posY = glHeight - result.messageArray.length * 10 - 5;
					}
				}
				return result;
			}
		}
		return undefined;
	}

	this.renderStartMessages = function() {
		if (this.startMessage) {
			this.startMessage.draw(8, 10);
		}
	}

	var visibleMapWidth = glWidth / this.levelData.tilewidth + 2;
	var visibleMapHeight = this.levelData.height;
	var vertexData = new Float32Array(visibleMapWidth * visibleMapHeight * 4 * 2 * 2); // 4 vertices per quad and 2xpos, 2xtexture
	var indexData = new Uint16Array(visibleMapWidth * visibleMapHeight * 6);
	this.tileMapX = 0;

	this.layers = [];
	this.platformLayer;
	this.objectsLayer;
	this.levelTileCollisionMap;
	this.showHUD = true;
	if (this.levelData.properties["hideHUD"] == "true") {
		this.showHUD = false;
	}
	this.playerSuit = "PLAYER";
	if (this.levelData.properties["playerSuit"]) {
		this.playerSuit = this.levelData.properties["playerSuit"];
	}

	for (i=0; i<this.levelData.layers.length; i++) {
		var currentLayer = this.levelData.layers[i];
		if (currentLayer.type == "tilelayer") {
			var tileMapLayer = new TileMapLayer(visibleMapWidth, visibleMapHeight, this.tileSize, currentLayer, this);
			this.layers.push(tileMapLayer);

			if (currentLayer.properties) {
				if (currentLayer.properties["type"] == "platform") {
					this.platformLayer = tileMapLayer;
					this.levelTileCollisionMap = tileMapLayer.layerContent;
				}
			}
		} else if (currentLayer.type = "objectgroup") {
			this.objectsLayer = currentLayer;
		}
	}

	this.initObjectsLookup = function() {
		this.objects = new Array();
		if (this.objectsLayer) {
			var i = this.objectsLayer.objects.length;
			while (i--) {
				var object = this.objectsLayer.objects[i];
				if (object.type == "playerStart") {
					continue;
				}
				var x = object.x / this.tileSize;
				var objectList = this.objects[x];
				if (!objectList) {
					objectList = new Array();
					this.objects[x] = objectList;
				}
				objectList.push(object);
			}
		}
	}
	this.initObjectsLookup();

	this.findObject = function(type, propName, propValue) {
		var i = this.objectsLayer.objects.length;
		while (i--) {
			var object = this.objectsLayer.objects[i];
			if (object.type != type) {
				continue;
			}
			if (!object.properties) {
				continue;
			}
			if (object.properties[propName] == propValue) {
				return object;
			}
		}
		return undefined;
	}

	var vertexDataIndex = 0;
	var indexDataIndex = 0;
	var index = 0;
	for (y = 0; y < visibleMapHeight; y++) {
		for (x = 0; x < visibleMapWidth; x++) {
			vertexData[vertexDataIndex++] = x * this.tileSize;
			vertexData[vertexDataIndex++] = y * this.tileSize;

			vertexData[vertexDataIndex++] = x * this.tileSize + this.tileSize;
			vertexData[vertexDataIndex++] = y * this.tileSize;

			vertexData[vertexDataIndex++] = x * this.tileSize + this.tileSize;
			vertexData[vertexDataIndex++] = y * this.tileSize + this.tileSize;

			vertexData[vertexDataIndex++] = x * this.tileSize;
			vertexData[vertexDataIndex++] = y * this.tileSize + this.tileSize;

			indexData[indexDataIndex++] = index + 0;
			indexData[indexDataIndex++] = index + 1;
			indexData[indexDataIndex++] = index + 2;

			indexData[indexDataIndex++] = index + 2;
			indexData[indexDataIndex++] = index + 3;
			indexData[indexDataIndex++] = index + 0;

			index += 4;
		}
	}

	this.vertexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

	this.indexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);

	this.destroy = function() {
		gl.deleteBuffer(this.vertexBuffer);
		gl.deleteBuffer(this.indexBuffer);
	}

	this.getTexture = function(textures) {
		if (this.levelData.tilesets[0]) {
			var tileSet = this.levelData.tilesets[0];
			if (tileSet) {
				return textures.get(tileSet.image)
			}
		}
		return undefined;
	}

	this.tileProperties = function(tileIndex) {
		if (this.levelData.tilesets[0]) {
			var tileSet = this.levelData.tilesets[0];
			if (tileSet) {
				if (tileSet.tileproperties) {
					var tileProps = tileSet.tileproperties[tileIndex-1];
					if (tileProps) {
						return tileProps;
					}
				}
			}
		}
		return undefined;
	}

	this.tileAt = function(x, y) {
		// we allow jumping out of the top and to the bottom
		if (y < 0 || y >= (visibleMapHeight - 1)) {
			return "";
		}
		var mapIndex = y * this.levelData.width + x;
		var tileIndex = this.levelTileCollisionMap[mapIndex];
		if (tileIndex == 0) {
			return "";
		}
		var tileProps = this.tileProperties(tileIndex);
		if (tileProps) {
			return tileProps;
		}
		return "block";
	}

	this.tileIndexAt = function(x, y) {
		// we allow jumping out of the top and to the bottom
		if (y < 0 || y >= this.visibleMapHeight) {
			return undefined;
		}
		var mapIndex = y * this.levelData.width + x;
 		return this.levelTileCollisionMap[mapIndex];
	}

	this.playerStart = function() {
		var objectsLayer = this.objectsLayer;
		if (!objectsLayer) {
			return null;
		}
		var i = objectsLayer.objects.length;
		while (i--) {
			var object = objectsLayer.objects[i];
			if (object.type != "playerStart") {
				continue;
			}
			return object;
		}
		return null;
	}

	this.iterateLayers = function(action) {
		for (i=0; i<this.layers.length; i++) {
			action(this.layers[i]);
		}
	}

	this.moveMap = function(newPosX, game) {
		this.tileMapX = newPosX;
		if (this.tileMapX > ((this.levelData.width - 2*16) * 16)) {
			this.tileMapX = ((this.levelData.width - 2*16) * 16);
		} else if (this.tileMapX < 0) {
			this.tileMapX = 0;
		}

		var newTileMapX = this.tileMapX;
		this.iterateLayers(function(layer) {
			layer.moveTileMap(newTileMapX);
		});

		this.spawnEnemies(game);
	}

	this.spawnEnemies = function() {
		var x = Math.floor(this.tileMapX / 16);
		for (i=x; i<x+visibleMapWidth; i++) {
			var listObjects = this.objects[i];
			if (listObjects) {
				var objIdx = listObjects.length;
				while (objIdx--) {
					var o = listObjects[objIdx];
					if (o.type == "enemy") {
						this.game.addObject(new Enemy(this.game, this.shader, this, o));
					} else if (o.type == "switch") {
						this.game.addObject(new Switch(this.game, this.shader, this, o));
					} else if (o.type == "playerEnd") {
						this.game.addObject(new PlayerEnd(this.game, this, o));
					}
				}
				this.objects[i] = null;
			}
		}
	}

	this.updateTileMap = function() {
		this.bonusTileAnimation.update();
		this.gemTileAnimation.update();
		this.iterateLayers(function(layer) {
			layer.updateTileMap();
		});
	}

	this.updateSingleTile = function(gx, gy, tileIndex) {
		this.platformLayer.updateSingleTile(gx, gy, tileIndex);
	}

	this.isCollision = function(x, y) {
		if (debugRender) {
			gl.vertexAttribPointer(this.shader.attribute("aPosition"), 2, gl.FLOAT, false, 4 * 4, 0);
			gl.vertexAttribPointer(this.shader.attribute("aTexture"), 2, gl.FLOAT, false, 4 * 4, 2 * 4);
			gl.uniform2fv(this.shader.uniform("pos"), [x * this.tileSize - this.tileMapX, y * this.tileSize]);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
		}
		var tile = this.tileAt(x, y);
		if (tile == "block") {
			return true;
		} else if (tile["type"] == "bridge" || tile["type"] == "bonus") {
			return true;
		}
		return false;
	}

	this.canMove = function(spriteInfo, what, x, y, player) {
		var x0 = Math.floor((x + spriteInfo.bx0) / this.tileSize);
		var x1 = Math.ceil((x + spriteInfo.bx1) / this.tileSize);
		var y0 = Math.floor((y + spriteInfo.by0) / this.tileSize);
		var y1 = Math.ceil((y + spriteInfo.by1) / this.tileSize);

		var result = true;
		if (what == "down") {
			for (x = x0; x < x1; x++) {
				if (this.isCollision(x, y1)) {
					result = false;
					this.handleSpecialBlockDown(x, y1, player);
				}
			}
		} else if (what == "up") {
			for (x = x0; x < x1; x++) {
				if (this.isCollision(x, y0)) {
					result = false;
					this.handleSpecialBlockUp(x, y0, player);
				}
			}
		} else if (what == "right") {
			for (y = y0; y < y1; y++) {
				if (this.isCollision(x1, y)) {
					result = false;
				}
			}
		} else if (what == "left") {
			for (y = y0; y < y1; y++) {
				if (this.isCollision(x0 - 1, y)) {
					result = false;
				}
			}
		}
		return result;
	}

	this.handleSpecialBlockDown = function(x, y, player) {
		var tile = this.tileAt(x, y);
		if (tile == "" || tile == "block") {
			return; // just a standard block or no block - no special treatment
		}
		if (tile["type"] == "bridge") {
			player.standingOnBridge(x, y);
		}
	}

	this.handleSpecialBlockUp = function(x, y, player) {
		var tile = this.tileAt(x, y);
		if (tile == "" || tile == "block") {
			return; // just a standard block or no block - no special treatment
		}
		if (tile["type"] == "bonus") {
			player.topBonus(x, y, tile);
		}
	}

	this.collides = function(spriteInfo, x, y) {
		var x0 = Math.floor((x + spriteInfo.bx0) / this.tileSize);
		var x1 = Math.ceil((x + spriteInfo.bx1) / this.tileSize);
		var y0 = Math.floor((y + spriteInfo.by0) / this.tileSize);
		var y1 = Math.ceil((y + spriteInfo.by1) / this.tileSize);

		var result = false;
		for (y = y0; y < y1; y++) {
			for (x = x0; x < x1; x++) {
				if (this.isCollision(x, y)) {
					result = true;
				}
			}
		}
		return result;
	}

	this.itemsCollides = function(spriteInfo, x, y) {
		var x0 = Math.floor((x + spriteInfo.bx0) / this.tileSize);
		var x1 = Math.ceil((x + spriteInfo.bx1) / this.tileSize);
		var y0 = Math.floor((y + spriteInfo.by0) / this.tileSize);
		var y1 = Math.ceil((y + spriteInfo.by1) / this.tileSize);

		var result;
		for (y = y0; y < y1; y++) {
			for (x = x0; x < x1; x++) {
				var tileProps = this.tileAt(x, y);
				if (tileProps && tileProps != "block") {
					if (!result) {
						result = new Array();
					}
					var resultInfo = new Object();
					resultInfo.type = tileProps.type;
					resultInfo.x = x;
					resultInfo.y = y;
					resultInfo.score = tileProps.score;
					result.push(resultInfo);
				}
			}
		}
		return result;
	}

	this.spriteMinX = function(spriteInfo, x, xadd) {
		var minX = (Math.floor((x + spriteInfo.bx0) / this.tileSize) - 1) * this.tileSize + this.tileSize;
		var newX = x + xadd;

		var result = new Object();
		result.newX = newX;
		result.fixed = false;

		if ((newX + spriteInfo.bx0) < minX) {
			result.newX = minX - spriteInfo.bx0;
			result.fixed = true;
		}
		return result;
	}

	this.spriteMaxX = function(spriteInfo, x, xadd) {
		var maxX = Math.ceil((x + spriteInfo.bx1) / this.tileSize) * this.tileSize;
		var newX = x + xadd;

		var result = new Object();
		result.newX = newX;
		result.fixed = false;

		if ((newX + spriteInfo.bx1) > maxX) {
			result.newX = (maxX - spriteInfo.bx1);
			result.fixed = true;
		}
		return result;
	}

	this.drawBackground = function() {
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.vertexAttribPointer(this.shader.attribute("aPosition"), 2, gl.FLOAT, false, 2 * 4, 0);

		var shader = this.shader;
		this.iterateLayers(function(layer) {
			layer.draw(shader, false);
		});

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}

	this.drawOverlay = function() {
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.vertexAttribPointer(this.shader.attribute("aPosition"), 2, gl.FLOAT, false, 2 * 4, 0);

		var shader = this.shader;
		this.iterateLayers(function(layer) {
			layer.draw(shader, true);
		});

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}

	this.spawnEnemies();
}

///////////////////////////////////////////////////////////////////////////////
// TextOut
///////////////////////////////////////////////////////////////////////////////

function TextOut(font, textArray, callback, x, y, fadeOut) {
	this.BLINK_TIME = 5;
	this.OUTPUT_TIME = 1;
	this.BLINK_COUNTER = 3;
	this.READ_COUNTER = 100;
	this.fadeOut = fadeOut;

	this.font = font;
	this.textArray = textArray;
	this.textArrayIdx = 0;
	this.callback = callback;
	this.x = x;
	this.y = y;
	this.currentText;
	this.currentTextIdx = 0;
	this.currentLineOut;
	this.lines = new Array();
	this.initialTimer = this.BLINK_TIME;
	this.initialBlinkCounter = this.BLINK_COUNTER;
	this.framecounter = this.initialTimer;
	this.doNothing = false;
	this.cursorChar = "%";

	this.blink = function() {
		if (this.currentLineOut.currentText.endsWith(this.cursorChar)) {
			this.currentLineOut.setText(this.currentLineOut.currentText.substr(0, this.currentLineOut.currentText.length - 1));
		} else {
			this.currentLineOut.setText(this.currentLineOut.currentText + this.cursorChar);
		}
		this.initialBlinkCounter -= 1;
		if (this.initialBlinkCounter < 0) {
			this.framecounterAction = this.output;
		}
		return this.BLINK_TIME;
	}

	this.output = function() {
		if (this.currentTextIdx < this.currentText.length - 1) {
			this.currentTextIdx += 1;
			this.currentLineOut.setText(this.currentText.substr(0, this.currentTextIdx) + this.cursorChar);
			return this.OUTPUT_TIME;
		}
		this.currentLineOut.setText(this.currentText);
		this.framecounterAction = this.nextLine;
		return this.OUTPUT_TIME;
	}

	this.nextLine = function() {
		if (this.textArrayIdx < this.textArray.length - 1) {
			this.textArrayIdx += 1;
			this.currentText = this.textArray[this.textArrayIdx];
			this.currentTextIdx = 0;
			this.currentLineOut = this.lines[this.textArrayIdx];
			this.initialBlinkCounter = 0;
			this.framecounterAction = this.blink;
			return this.BLINK_TIME;
		}
		if (this.fadeOut) {
			this.framecounterAction = this.startFadeOut;
			return this.READ_COUNTER;
		} else {
			this.framecounterAction = this.done;
			return 1;
		}
	}

	this.startFadeOut = function() {
		for (i=0; i<this.lines.length; i++) {
			this.lines[i].enableFade(1.0, 0.0, 30);
		}
		this.framecounterAction = this.done;
		return 30;
	}

	this.done = function() {
		this.doNothing = true;
		if (this.callback) {
			this.callback();
		}
	}

	this.draw = function() {
		if (!this.doNothing) {
			this.framecounter -= 1;
			if (this.framecounter < 0) {
				this.framecounter = this.framecounterAction();
			}
		}

		for (i=0; i<this.lines.length; i++) {
			this.lines[i].render(this.x, this.y + 10 * i);
		}
	}

	if (!this.textArray || this.textArray.length == 0) {
		this.doNothing = true;
	} else {
		this.textArrayIdx = 0;
		this.currentText = this.textArray[this.textArrayIdx];
		this.framecounterAction = this.blink;

		for (i=0; i<textArray.length; i++) {
			this.lines.push(this.font.createText(""));
		}
		this.currentLineOut = this.lines[0];
	}
}

///////////////////////////////////////////////////////////////////////////////
// Intro Text Stuff
///////////////////////////////////////////////////////////////////////////////

function IntroText(yOff, textBoxSpriteName, shader, font, mainTexture, spriteVertexBuffer, currentlyPressedKeys, introText, doneTextCallback) {
	this.shader = shader;
	this.mainTexture = mainTexture;
	this.spriteVertexBuffer = spriteVertexBuffer;
	this.currentlyPressedKeys = currentlyPressedKeys;
	this.doneTextCallback = doneTextCallback;
	this.x = (glWidth - 64*5) / 2;
	this.y = yOff;
	this.textBoxLeft = constants[textBoxSpriteName + "_LEFT"];
	this.textBoxRight = constants[textBoxSpriteName + "_RIGHT"];
	this.textBoxMiddle = constants[textBoxSpriteName + "_MIDDLE"];
	this.textArray = introText;
	this.textArrayIdx = 0;
	this.textDone = false;
	var that = this;
	this.textOut = new TextOut(font, this.textArray[this.textArrayIdx].text, function() { that.textDone = true }, this.x + 50, this.y + 6);
	this.portrait = getPortrait();

	function getPortrait() {
		return constants[that.textArray[that.textArrayIdx].portrait];
	}

	this.draw = function() {
		if (this.textDone) {
			if (this.currentlyPressedKeys[keySpace] || this.currentlyPressedKeys[keyCtrl]) {
				this.textDone = false;
				this.textArrayIdx += 1;
				if (this.textArrayIdx < this.textArray.length) {
					this.textOut = new TextOut(font, this.textArray[this.textArrayIdx].text, function() { that.textDone = true }, this.x + 50, this.y + 6);
					this.portrait = getPortrait();
				} else {
					if (this.doneTextCallback) {
						this.doneTextCallback();
					}
				}
			}
		}
		gl.bindTexture(gl.TEXTURE_2D, this.mainTexture);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteVertexBuffer);
		gl.vertexAttribPointer(this.shader.attribute("aPosition"), 2, gl.FLOAT, false, 4 * 4, 0);
		gl.vertexAttribPointer(this.shader.attribute("aTexture"), 2, gl.FLOAT, false, 4 * 4, 2 * 4);
		gl.uniform2fv(this.shader.uniform("pos"), [Math.floor(this.x + 0 * 64), Math.floor(this.y)]);
		gl.drawArrays(gl.TRIANGLES, this.textBoxLeft.index, 6);

		gl.uniform2fv(this.shader.uniform("pos"), [Math.floor(this.x + 1 * 64), Math.floor(this.y)]);
		gl.drawArrays(gl.TRIANGLES, this.textBoxMiddle.index, 6);

		gl.uniform2fv(this.shader.uniform("pos"), [Math.floor(this.x + 2 * 64), Math.floor(this.y)]);
		gl.drawArrays(gl.TRIANGLES, this.textBoxMiddle.index, 6);

		gl.uniform2fv(this.shader.uniform("pos"), [Math.floor(this.x + 3 * 64), Math.floor(this.y)]);
		gl.drawArrays(gl.TRIANGLES, this.textBoxMiddle.index, 6);

		gl.uniform2fv(this.shader.uniform("pos"), [Math.floor(this.x + 4 * 64), Math.floor(this.y)]);
		gl.drawArrays(gl.TRIANGLES, this.textBoxRight.index, 6);

		gl.uniform2fv(this.shader.uniform("pos"), [Math.floor(this.x + 8), Math.floor(this.y + 8)]);
		gl.drawArrays(gl.TRIANGLES, this.portrait.index, 6);

		this.textOut.draw();
	}
}
