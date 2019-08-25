/**
 * Score
 */
function Score() {
	this.score = 0;
	this.bonus = 0;
	this.lives = 3;
	this.stage = 1;
	this.time = 99;
	this.framecounter = 60;

	this.reset = function() {
		this.score = 0;
		this.bonus = 0;
		this.lives = 3;
		this.stage = 1;
		this.time = 99;
		this.framecounter = 60;
	}

	this.addBonus = function() {
 		this.bonus += 1;
		if (this.bonus > 99) {
			this.lives += 1;
			this.bonus = 0;
		}
	}

	this.killEnemy = function() {
		this.score += 100;
	}

	this.bossKill = function() {
		this.score += 100000;
	}

	this.timeBonus = function() {
		this.score += 10;
	}

	this.updateTime = function() {
		this.framecounter -= 1;
		if (this.framecounter < 0) {
			this.framecounter = 60;
			this.time -= 1;
			if (this.time < 0) {
				return true;
			}
		}
		return false;
	}

	this.lostLife = function() {
		this.lives -= 1;
		return (this.lives <= 0);
	}
}

/**
 * Knete
 */
function Player(game, message, currentlyPressedKeys, spriteShader, tileMap, dieCallback) {
	this.game = game;
	this.message = message;
	this.currentlyPressedKeys = currentlyPressedKeys;
	this.spriteShader = spriteShader;
	this.tileMap = tileMap;
	this.dieCallback = dieCallback;
	this.score = game.score;
	this.visible = this.tileMap.startMessage == null;
	this.powerUpSprite = constants["POWER-UP"];

	// we can register callbacks in here for touch events using the ACTION attribute as the key
	this.touchCallbacks = [];

	// callback that will be activated when the level end object is reached
	this.endLevelCallback;

	this.quotes = [
		"Groovy!",
		"Hail to the queen, baby!",
		"Heh, heh, heh... what a mess!",
		"Let's rock!",
		"Sometimes I even amaze myself.",
		"My boot, your face; the perfect couple.",
		"Who wants some?",
		"Yeah, piece of cake!",
		"Ooh, that's gotta hurt."
	];

	var minXWalking = 0;
	var minXScrolling = 75;
	var maxXWalking = 512 - 32;
	var maxXScrolling = 512 - 75 - 32;
	var jumpSpeed = -4.5;
	var gravity = 0.15;
	var runSpeed = 2;
	var reloadTime = 20;
	var standingOnBridgeTime = 8;
	var powerUpTime = 60 * 10;

	function DiePart(parent, mirror, x, y, xdir, ydir, name) {
		this.parent = parent;
		this.mirror = mirror;
		this.x = x;
		this.y = y;
		this.xdir = xdir;
		this.ydir = ydir;
		this.xs = 1.5;
		this.ys = 1.5;
		this.spriteInfo = constants[name + mirror];

		this.draw = function(tileMapX) {
			this.x += this.xdir * this.xs;
			this.y += this.ydir * this.ys;
			gl.uniform2fv(parent.spriteShader.uniform("pos"), [Math.floor(this.x - tileMapX), Math.floor(this.y)]);
			gl.drawArrays(gl.TRIANGLES, this.spriteInfo.index, 6);
		}
	}

	this.show = function() {
		this.visible = true;
		this.justTurnedVisibleOn = true;
	}

	this.hide = function() {
		this.visible = false;
	}

	this.updateDie = function() {
		this.y += this.die_yspeed;
		this.die_yspeed += this.die_yaccel;
		if (Math.abs(this.die_yspeed) < 0.1) {
			this.die_yaccel = -this.die_yaccel;
			this.die_yspeed = 0.1;
		}
		if (this.y > glHeight) {
			if (dieCallback) {
				dieCallback(this.score.lostLife());
			}
		}
	}

	this.introKnete = false;
	this.simFrameCounter = 0;
	this.simPressedKeys = [];
	this.simKeysIdx = 0;
	this.simKeys = [
		{ t:100, keyOn:keyRightArrow },
		{ t:200, keyOff:keyRightArrow },
		{ t:520, keyOn:keySpace },
		{ t:521, keyOff:keySpace },
		{ t:600, keyOn:keyLeftArrow },
		{ t:703, keyOff:keyLeftArrow },
		{ t:704, keyOn:keyRightArrow },
		{ t:705, keyOff:keyRightArrow },
		{ t:800, keyOn:keyUpArrow },
		{ t:820, keyOff:keyUpArrow },
	];

	this.updateRegular = function() {
		if (!this.visible) {
			return;
		}
		// animation
		if (this.introKnete) {
			this.simFrameCounter += 1;
			if (this.simFrameCounter == this.simKeys[this.simKeysIdx].t) {
				var keyFrame = this.simKeys[this.simKeysIdx];
				if (keyFrame.keyOn) {
					this.simPressedKeys[keyFrame.keyOn] = 1;
				} else if (keyFrame.keyOff) {
					this.simPressedKeys[keyFrame.keyOff] = 0;
				}

				if (this.simKeysIdx < this.simKeys.length - 1) {
					this.simKeysIdx += 1;
				} else {
					this.simKeysIdx = 0;
					this.simFrameCounter = 0;
					this.x = this.ox;
					this.y = this.oy;
					this.game.objects.length = 0;
					this.game.bullets.length = 0;
					this.tileMap.initObjectsLookup();
					this.tileMap.spawnEnemies();
				}
			}
		}

		this.idlecounter++;

		if (this.powerUp) {
			this.powerUpTimer -= 1;
			if (this.powerUpTimer < 0) {
				this.powerUp = false;
				jumpSpeed = -4.5;
				runSpeed = 2;
			}
		}

		this.keyDown = function(key) {
			if (this.introKnete) {
				return this.simPressedKeys[key];
			} else {
				return this.currentlyPressedKeys[key];
			}
		}

		if (this.keyDown(keyRightArrow) || this.keyDown(keyD)) {
			this.turnCheck(1);
			this.xdir = 1;
			this.idlecounter = 0;
			this.xframe++;
			this.xspeed = runSpeed;
			if (this.xspeed == 0) {
				this.xframe = 0;
			}
		} else if (this.keyDown(keyLeftArrow) || this.keyDown(keyA)) {
			this.turnCheck(-1);
			this.xdir = -1;
			this.xspeed = runSpeed;
			this.idlecounter = 0;
			this.xframe++;
			if (this.xspeed == 0) {
				this.xframe = 0;
			}
		}
		if (!this.jumping && !this.jumpingKeyBlocked && (this.keyDown(keyUpArrow) || this.keyDown(keyW))) {
			this.yspeed = jumpSpeed;
			this.jumping = true;
			this.jumpingKeyBlocked = true;
			this.falling = false;
			this.idlecounter = 0;
		} else {}

		if (this.keyDown(keySpace) || this.keyDown(keyCtrl)) {
			if (this.shootingAllowed) {
				if (!this.shooting) {
					this.shooting = true;
					this.shootingframe = 0;
					this.idlecounter = 0;
				}
			}
		}

		if (!(this.keyDown(keyUpArrow) || this.keyDown(keyW))) {
			this.jumpingKeyBlocked = false;
		}

		if (!(this.keyDown(keySpace) || this.keyDown(keyCtrl))) {
			this.shooting = false;
		}

		this.xspeed -= 0.5;
		if (this.xspeed < 0) {
			this.xspeed = 0;
			this.xframe = 0;
		}

		this.yspeed += gravity;
		if (this.yspeed > 0.5) {
			this.falling = true;
		}

		this.playerSpriteInfo = this.spriteInfo(this.xdir);

		if (this.jumping || this.falling || this.xframe > 2) {
			if ((this.xdir * this.xspeed) > 0) {
				if (!tileMap.canMove(this.playerSpriteInfo, "right", this.x, this.y)) {
					var result = tileMap.spriteMaxX(this.playerSpriteInfo, this.x, this.xdir * this.xspeed);
					if (result.fixed) {
						this.xspeed = 0;
					}
					this.x = result.newX;
				} else {
					this.x += this.xdir * this.xspeed;
				}
			} else if ((this.xdir * this.xspeed) < 0) {
				if (!tileMap.canMove(this.playerSpriteInfo, "left", this.x, this.y)) {
					var result = tileMap.spriteMinX(this.playerSpriteInfo, this.x, this.xdir * this.xspeed);
					if (result.fixed) {
						this.xspeed = 0;
					}
					this.x = result.newX;
				} else {
					this.x += this.xdir * this.xspeed;
				}
			}
		}

		if (this.yspeed > 0) {
			if (!tileMap.canMove(this.playerSpriteInfo, "down", this.x, this.y, this)) {
				var tileY = Math.ceil((this.y + this.playerSpriteInfo.by1) / tileMap.tileSize);
				var maxY = tileY * tileMap.tileSize;

				this.y += this.yspeed;
				if ((this.y + this.playerSpriteInfo.by1) > maxY) {
					this.y = maxY - this.playerSpriteInfo.by1;
					this.yspeed = 0;
					this.jumping = false;
					this.falling = false;

					if (this.justTurnedVisibleOn) {
						this.justTurnedVisibleOn = false;
						var playerStartMessage = this.tileMap.playerStartMessage;
						if (playerStartMessage) {
							this.message.show(this.x, this.y, playerStartMessage);
						}
					}
				}
			} else {
				this.y += this.yspeed;
			}
		} else if (this.yspeed < 0) {
			if (!tileMap.canMove(this.playerSpriteInfo, "up", this.x, this.y, this)) {
				this.yspeed = gravity * 10;
				this.y += this.yspeed;
				var tileY = Math.ceil((this.y + this.playerSpriteInfo.by1) / tileMap.tileSize);
				this.y = Math.floor(tileY * tileMap.tileSize - this.playerSpriteInfo.by1);
			} else {
				this.y += this.yspeed;
			}
		}

		if (this.y > glHeight) {
			if (dieCallback) {
				dieCallback(this.score.lostLife());
			}
		}

		var screenX = this.x - this.tileMap.tileMapX;
		if (screenX > maxXScrolling) {
			if (this.tileMap.tileMapX < ((this.tileMap.levelData.width - 2*16) * 16)) {
				this.moveMap.needsMove = true;
				this.moveMap.value = this.tileMap.tileMapX + (screenX - maxXScrolling);
				this.x = this.moveMap.value + maxXScrolling;
			} else if (screenX > maxXWalking) {
				this.x = this.tileMap.tileMapX + maxXWalking;
			}
		} else if (screenX < minXScrolling) {
			if (this.tileMap.tileMapX > 0) {
				this.moveMap.needsMove = true;
				this.moveMap.value = this.tileMap.tileMapX - (minXScrolling - screenX);
				this.x = this.moveMap.value + minXScrolling;
			} else if (screenX < minXWalking) {
				this.x = this.tileMap.tileMapX + minXWalking;
			}
		}

		if (this.shooting) {
			this.shootingframe -= 1;
			if (this.shootingframe <= 0) {
				this.shootingframe = reloadTime;
				this.game.addBullet(
					new Bullet(
						this.tileMap,
						this.spriteShader,
						this.x + this.playerSpriteInfo.sx,
						this.y + this.playerSpriteInfo.sy,
						this.xdir));
			}
		}

		var itemsTouched = this.tileMap.itemsCollides(this.playerSpriteInfo, this.x, this.y);
		if (itemsTouched) {
			var i = itemsTouched.length;
			while (i--) {
				var info = itemsTouched[i];
				if (info.type == "gem") {
					if (info.score) {
						this.score.score += Number(info.score);
					}
					this.score.addBonus();
					this.tileMap.updateSingleTile(info.x, info.y, 0);
				}
			}
		}
	}

	this.updateMoveMap = function() {
		if (this.moveMap.needsMove) {
			this.moveMap.needsMove = false;
			this.tileMap.moveMap(this.moveMap.value);
		}
	}

	this.turnCheck = function(newDir) {
		if (newDir == this.xdir) {
			return;
		}

		// we've just turned around! lets adjust the player position so that it alignes with the old one.
		// we assume that the current position is valid.
		var newSpriteInfo = this.spriteInfo(newDir);
		var curOff = this.playerSpriteInfo.bx0;
		var newOff = newSpriteInfo.bx0;
		if (curOff < newOff) {
			this.x -= newOff - curOff;
		} else if (newOff < curOff) {
			this.x += curOff - newOff;
		}
	}

	this.directionConstant = function(key, currentDir) {
		var result = this.playerSuit + "_" + key;
		if (this.shooting) {
			result += "_S";
		}
		if (currentDir < 0) {
			result += "_M";
		}
		return result;
	}

	this.spriteInfo = function(currentDir) {
		if (this.falling || this.jumping) {
			return constants[this.directionConstant("JUMP", currentDir)];
		} else if (this.idlecounter < 200) {
			if (this.xframe > 0) {
				if (this.xframe < 5) {
					return constants[this.directionConstant("WALK_0", currentDir)];
				} else {
					var walkCycle = Math.floor((this.xframe / 8) % 4 + 1);
					return constants[this.directionConstant("WALK_" + walkCycle, currentDir)];
				}
			}
			return constants[this.directionConstant("STANDING", currentDir)];
		} else {
			return constants[this.directionConstant("TIRED", currentDir)];
		}
	}

	this.drawRegular = function() {
		if (!this.visible) {
			return;
		}
		if (!this.playerSpriteInfo) {
			return;
		}
		gl.vertexAttribPointer(this.spriteShader.attribute("aPosition"), 2, gl.FLOAT, false, 4 * 4, 0);
		gl.vertexAttribPointer(this.spriteShader.attribute("aTexture"), 2, gl.FLOAT, false, 4 * 4, 2 * 4);
		gl.uniform2fv(this.spriteShader.uniform("pos"), [Math.floor(this.x - this.tileMap.tileMapX), Math.floor(this.y)]);
		gl.drawArrays(gl.TRIANGLES, this.playerSpriteInfo.index, 6);

		if (this.powerUp) {
			gl.uniform2fv(this.spriteShader.uniform("pos"), [Math.floor(this.x - this.tileMap.tileMapX + 8), Math.floor(this.y - 16)]);
			gl.drawArrays(gl.TRIANGLES, this.powerUpSprite.index, 6);
		}
	}

	this.drawDie = function() {
		gl.vertexAttribPointer(this.spriteShader.attribute("aPosition"), 2, gl.FLOAT, false, 4 * 4, 0);
		gl.vertexAttribPointer(this.spriteShader.attribute("aTexture"), 2, gl.FLOAT, false, 4 * 4, 2 * 4);
		gl.uniform2fv(this.spriteShader.uniform("pos"), [Math.floor(this.x - this.tileMap.tileMapX), Math.floor(this.y)]);
		gl.drawArrays(gl.TRIANGLES, this.playerSpriteInfo.index, 6);

		for (i=0; i<this.dieParts.length; i++) {
			this.dieParts[i].draw(this.tileMap.tileMapX);
		}
	}

	this.topBonus = function(x, y, tile) {
		this.tileMap.updateSingleTile(x, y, 7); // 7 is empty bonus tile
		this.score.addBonus();

		if (tile["powerUp"] == "true") {
			var powerUp = {
	         	"height":16,
	         	"properties": {},
	         	"type":"powerUp",
	         	"width":16,
	         	"x": x * this.tileMap.tileSize,
	         	"y": y * this.tileMap.tileSize - 20
	        };
			this.game.addObject(new PowerUp(this.game, this.spriteShader, this.tileMap, powerUp));
		} else {
			var objectInfo = {
	         	"height":16,
	         	"properties": {},
	         	"type":"bonus",
	         	"width":16,
	         	"x": x * this.tileMap.tileSize,
	         	"y": y * this.tileMap.tileSize
	        };
			this.game.addObject(new Bonus(this.game, this.spriteShader, this.tileMap, objectInfo));
		}
	}

	this.standingOnBridge = function(x, y) {
		this.standingOnBridgeTimer -= 1;
		if (this.standingOnBridgeTimer < 0) {
			this.standingOnBridgeTimer = standingOnBridgeTime;
			var index = this.tileMap.tileIndexAt(x, y);
			var nextIndex = index + 1;
			var nextTile = this.tileMap.tileProperties(nextIndex);
			if (nextTile && nextTile["type"] == "bridge") {
				this.tileMap.updateSingleTile(x, y, nextIndex);
			} else {
				this.tileMap.updateSingleTile(x, y, 0);
			}
		}
	}

	this.init = function() {
		this.update = this.updateRegular;
		this.draw = this.drawRegular;
		this.playerSuit = this.tileMap.playerSuit;
		this.playerStart = this.tileMap.playerStart();
		this.xspeed = 0;
		this.yspeed = 0;
		this.xdir = 1;
		this.xframe = 0;
		this.jumping = true;
		this.jumpingKeyBlocked = false;
		this.falling = true;
		this.shooting = false;
		this.shootingAllowed = !this.tileMap.isCutScene;
		if (this.playerStart) {
			this.x = this.playerStart.x;
			this.y = this.playerStart.y;
			this.ox = this.x;
			this.oy = this.y;
			if (this.playerStart.properties) {
				this.introKnete = this.playerStart.properties["introKnete"];
				if (this.introKnete) {
					this.shootingAllowed = true;
				}
			}
		}
		this.standingOnBridgeTimer = standingOnBridgeTime;
		this.idlecounter = 0;
		this.shootingframe = 0;
		this.moveMap = new Object();
		this.dying = false;
		this.playerSpriteInfo = this.spriteInfo(this.xdir);
		this.powerUp = false;
		jumpSpeed = -4.5;
		runSpeed = 2;
	}

	this.reset = function() {
		this.init();
		this.visible = true;
		this.score.time = 99;
	}

	this.die = function() {
		this.dying = true;
		this.die_yspeed = -5;
		this.die_yaccel = 0.1;
		
		var mirror = (this.xdir < 0 ? "_M" : "");
		this.dieParts = [
			new DiePart(this, mirror, this.x,      this.y,      -1, -1, "PLAYER_DIE_PART1"),
			new DiePart(this, mirror, this.x + 16, this.y,       1, -1, "PLAYER_DIE_PART2"),
			new DiePart(this, mirror, this.x,      this.y + 16, -1,  1, "PLAYER_DIE_PART3"),
			new DiePart(this, mirror, this.x + 16, this.y + 16,  1,  1, "PLAYER_DIE_PART4")];
		this.playerSpriteInfo = constants["PLAYER_DIE" + mirror];
		this.update = this.updateDie;
		this.draw = this.drawDie;
	}

	this.randomQuote = function() {
		var idx = Math.floor((Math.random()*this.quotes.length));
		this.message.show(this.x, this.y, this.quotes[idx]);
	}

	this.touches = function(currentObj) {
		if (this.dying) {
			return;
		}
		if (!currentObj) {
			return;
		}
		if (currentObj.objectInfo) {
			if (currentObj.objectInfo.type == "enemy") {
				if (this.yspeed > 0.5) {
					if (currentObj.makeFlat()) {
						this.score.killEnemy();
						this.randomQuote();
					}
				} else {
					this.die();
				}
			} else if (currentObj.objectInfo.type == "playerEnd") {
				if (this.endLevelCallback) {
					this.endLevelCallback(objectProperty(currentObj.objectInfo, "nextLevel"));
				}
				currentObj.done();
				return;
			} else if (currentObj.objectInfo.type == "powerUp") {
				this.activatePowerUp();
				this.message.show(this.x, this.y, "Ooh, I needed that!");
				currentObj.done();
				return;
			} else if (currentObj.objectInfo.type == "boss") {
				this.die();
				return;
			}
		}
		var callback = this.touchCallbacks[currentObj.action];
		if (callback) {
			currentObj.done();
			callback();
		}
	}

	this.activatePowerUp = function() {
		this.powerUp = true;
		this.powerUpTimer = powerUpTime;
		jumpSpeed = -5.5;
		runSpeed = 3;
	}

	this.init();
}

/**************************************************************************************************************
 * Bullet
 **************************************************************************************************************/
function Bullet(tileMap, shader, x, y, xdir) {
	this.tileMap = tileMap;
	this.shader = shader;
	this.xdir = xdir;
	this.dead = false;
	this.outOfScreenDestroy = true;

	if (xdir == -1) {
		this.spriteInfo = constants["BULLET_M"];
		this.xoff = -this.spriteInfo.width;
		this.collisionCheckDir = "left";
	} else {
		this.spriteInfo = constants["BULLET"];
		this.xoff = 0;
		this.collisionCheckDir = "right";
	}
	this.x = x + this.xoff;
	this.y = y - this.spriteInfo.height / 2;
	this.speed = 8;
	this.deadframes = 20;
	this.deadframecounter = 0;

	this.update = function(mapXPos) {
		if (this.dead) {
			this.deadframecounter -= 1;
			return this.deadframecounter < 0;
		}
		if (this.tileMap.collides(this.spriteInfo, this.x, this.y)) {
			return true;
		} else {
			if (xdir == 1) {
				if (!this.tileMap.canMove(this.spriteInfo, this.collisionCheckDir, this.x, this.y)) {
					var result = tileMap.spriteMaxX(this.spriteInfo, this.x, this.xdir * this.speed);
					this.x = result.newX;
					if (result.fixed) {
						this.speed = 0;
						this.dead = true;
						this.deadframecounter = this.deadframes;
						this.spriteInfo = constants["BULLET_KILLED"];
					}
				} else {
					this.x += this.xdir * this.speed;
				}
			} else {
				if (!this.tileMap.canMove(this.spriteInfo, this.collisionCheckDir, this.x, this.y)) {
					var result = tileMap.spriteMinX(this.spriteInfo, this.x, this.xdir * this.speed);
					this.x = result.newX;
					if (result.fixed) {
						this.speed = 0;
						this.dead = true;
						this.deadframecounter = this.deadframes;
						this.spriteInfo = constants["BULLET_KILLED_M"];
					}
				} else {
					this.x += this.xdir * this.speed;
				}
			}
			return false;
		}
	}

	this.draw = function(mapXPos) {
		gl.vertexAttribPointer(this.shader.attribute("aPosition"), 2, gl.FLOAT, false, 4 * 4, 0);
		gl.vertexAttribPointer(this.shader.attribute("aTexture"), 2, gl.FLOAT, false, 4 * 4, 2 * 4);
		gl.uniform2fv(this.shader.uniform("pos"), [Math.floor(this.x - mapXPos), Math.floor(this.y)]);
		gl.drawArrays(gl.TRIANGLES, this.spriteInfo.index, 6);
	}
}

/**************************************************************************************************************
 * Enemy
 **************************************************************************************************************/
function Enemy(game, shader, tileMap, objectInfo) {
	this.game = game;
	this.shader = shader;
	this.tileMap = tileMap;
	this.objectInfo = objectInfo;
	this.enemy = true;

	this.outOfScreenDestroy = false;
	this.x = objectInfo.x;
	this.y = objectInfo.y;
	this.xspeed = 0;
	this.yspeed = 0;
	this.xdir = objectInfo.properties["xdir"] ? objectInfo.properties["xdir"] : -1;
	this.xframe = 0;
	this.falling = true;
	this.walkDirection = "left";
	this.visible = true;
	this.flat = false;
	this.collidable = true;
	this.removeOnFlat = false;
	this.removeOnFlatTimer = 60 * 10;

	var gravity = 0.15;
	var runSpeed = 1;

	this.update = function(mapXPos) {
		if (this.flat) {
			// make sure we fall down even when being flat
			this.yspeed += gravity;
			if (this.yspeed > 0.5) {
				this.falling = true;
			}

			if (this.yspeed > 0) {
				if (!tileMap.canMove(this.spriteInfo, "down", this.x, this.y)) {
					var tileY = Math.ceil((this.y + this.spriteInfo.by1) / tileMap.tileSize);
					var maxY = tileY * tileMap.tileSize;

					this.y += this.yspeed;
					if ((this.y + this.spriteInfo.by1) > maxY) {
						this.y = maxY - this.spriteInfo.by1;
						this.yspeed = 0;
						this.jumping = false;
						this.falling = false;
					}
				} else {
					this.y += this.yspeed;
				}
			}

			// usual check
			if (this.removeOnFlat) {
				this.removeOnFlatTimer -= 1;
				if (this.removeOnFlatTimer < 0) {
					return true;
				}
				return false;
			}
			return false;
		}
		if (this.walkDirection == "right") {
			this.turnCheck(1);
			this.xdir = 1;
			this.xframe++;
			this.xspeed = runSpeed;
			if (this.xspeed == 0) {
				this.xframe = 0;
			}
		} else if (this.walkDirection == "left") {
			this.turnCheck(-1);
			this.xdir = -1;
			this.xspeed = runSpeed;
			this.xframe++;
			if (this.xspeed == 0) {
				this.xframe = 0;
			}
		}

		this.xspeed -= 0.5;
		if (this.xspeed < 0) {
			this.xspeed = 0;
			this.xframe = 0;
		}

		this.yspeed += gravity;
		if (this.yspeed > 0.5) {
			this.falling = true;
		}

		this.spriteInfo = this.updateSpriteInfo(this.xdir);

		if ((this.xdir * this.xspeed) > 0) {
			if (!tileMap.canMove(this.spriteInfo, "right", this.x, this.y)) {
				var result = tileMap.spriteMaxX(this.spriteInfo, this.x, this.xdir * this.xspeed);
				if (result.fixed) {
					this.xspeed = 0;
					this.walkDirection = "left";
				}
				this.x = result.newX;
			} else {
				this.x += this.xdir * this.xspeed;
			}
		} else if ((this.xdir * this.xspeed) < 0) {
			if (!tileMap.canMove(this.spriteInfo, "left", this.x, this.y)) {
				var result = tileMap.spriteMinX(this.spriteInfo, this.x, this.xdir * this.xspeed);
				if (result.fixed) {
					this.xspeed = 0;
					this.walkDirection = "right";
				}
				this.x = result.newX;
			} else {
				this.x += this.xdir * this.xspeed;
			}
		}

		if (this.yspeed > 0) {
			if (!tileMap.canMove(this.spriteInfo, "down", this.x, this.y)) {
				var tileY = Math.ceil((this.y + this.spriteInfo.by1) / tileMap.tileSize);
				var maxY = tileY * tileMap.tileSize;

				this.y += this.yspeed;
				if ((this.y + this.spriteInfo.by1) > maxY) {
					this.y = maxY - this.spriteInfo.by1;
					this.yspeed = 0;
					this.jumping = false;
					this.falling = false;
				}
			} else {
				this.y += this.yspeed;
			}
		} else if (this.yspeed < 0) {
			if (!tileMap.canMove(this.spriteInfo, "up", this.x, this.y)) {
				this.yspeed = gravity * 10;
				this.y += this.yspeed;
				var tileY = Math.ceil((this.y + this.spriteInfo.by1) / tileMap.tileSize);
				this.y = Math.floor(tileY * tileMap.tileSize - this.spriteInfo.by1);
			} else {
				this.y += this.yspeed;
			}
		}
		return false;
	}

	this.turnCheck = function(newDir) {
		if (newDir == this.xdir) {
			return;
		}

		// we've just turned around! lets adjust the player position so that it alignes with the old one.
		// we assume that the current position is valid.
		var newSpriteInfo = this.updateSpriteInfo(newDir);
		var curOff = this.spriteInfo.bx0;
		var newOff = newSpriteInfo.bx0;
		if (curOff < newOff) {
			this.x -= newOff - curOff;
		} else if (newOff < curOff) {
			this.x += curOff - newOff;
		}
	}

	this.directionConstant = function(key, currentDir) {
		var result = key;
		if (currentDir < 0) {
			result += "_M";
		}
		return result;
	}

	this.updateSpriteInfo = function(currentDir) {
		if (this.flat) {
			return constants[this.directionConstant("OWL_WALK_FLAT", currentDir)];
		} else if (this.falling) {
			return constants[this.directionConstant("OWL_FLY", currentDir)];
		} else if (this.xframe > 0) {
			var walkCycle = Math.floor((this.xframe / 8) % 2);
			return constants[this.directionConstant("OWL_WALK_" + walkCycle, currentDir)];
		} else {
			return constants[this.directionConstant("OWL_STANDING", currentDir)];
		}
	}

	this.makeFlat = function() {
		this.flat = true;
		this.outOfScreenDestroy = true;
		this.collidable = false;
		this.spriteInfo = this.updateSpriteInfo(this.xdir);
		return true;
	}

	this.draw = function(mapXPos) {
		gl.vertexAttribPointer(this.shader.attribute("aPosition"), 2, gl.FLOAT, false, 4 * 4, 0);
		gl.vertexAttribPointer(this.shader.attribute("aTexture"), 2, gl.FLOAT, false, 4 * 4, 2 * 4);
		gl.uniform2fv(this.shader.uniform("pos"), [Math.floor(this.x - mapXPos), Math.floor(this.y)]);
		gl.drawArrays(gl.TRIANGLES, this.spriteInfo.index, 6);
	}

	this.spriteInfo = this.updateSpriteInfo(this.xdir);
}

/**************************************************************************************************************
 * Bonus
 **************************************************************************************************************/
function Bonus(game, shader, tileMap, objectInfo) {
	this.game = game;
	this.shader = shader;
	this.tileMap = tileMap;
	this.objectInfo = objectInfo;
	this.enemy = false;
	this.outOfScreenDestroy = true;
	this.x = objectInfo.x;
	this.y = objectInfo.y;
	this.visible = true;
	this.collidable = false;
	this.spriteInfo = constants["BONUS"];
	this.life = 15;
	this.yspeed = -3;

	this.update = function(mapXPos) {
		this.y += this.yspeed;
		this.yspeed += 0.2;
		this.life -= 1;
		if (this.life < 0) {
			return true;
		}
		return false;
	}

	this.draw = function(mapXPos) {
		gl.vertexAttribPointer(this.shader.attribute("aPosition"), 2, gl.FLOAT, false, 4 * 4, 0);
		gl.vertexAttribPointer(this.shader.attribute("aTexture"), 2, gl.FLOAT, false, 4 * 4, 2 * 4);
		gl.uniform2fv(this.shader.uniform("pos"), [Math.floor(this.x - mapXPos), Math.floor(this.y)]);
		gl.drawArrays(gl.TRIANGLES, this.spriteInfo.index, 6);
	}
}

/**************************************************************************************************************
 * Power Up
 **************************************************************************************************************/
function PowerUp(game, shader, tileMap, objectInfo) {
	this.game = game;
	this.shader = shader;
	this.tileMap = tileMap;
	this.objectInfo = objectInfo;
	this.enemy = false;
	this.outOfScreenDestroy = true;
	this.x = objectInfo.x;
	this.y = objectInfo.y;
	this.visible = true;
	this.collidable = true;
	this.spriteInfo = constants["POWER-UP"];
	this.life = 15;

	var gravity = 0.15;
	var runSpeed = 1;

	this.xdir = 1;
	this.xspeed = 1;
	this.yspeed = 0;
	this.doneValue = false;

	this.done = function() {
		this.doneValue = true;
	}

	this.update = function(mapXPos) {
		if (this.doneValue) {
			return true;
		}

		this.yspeed += gravity;
		if (this.yspeed > 0.5) {
			this.falling = true;
		}

		if ((this.xdir * this.xspeed) > 0) {
			if (!tileMap.canMove(this.spriteInfo, "right", this.x, this.y)) {
				var result = tileMap.spriteMaxX(this.spriteInfo, this.x, this.xdir * this.xspeed);
				if (result.fixed) {
					this.xdir = -this.xdir;
				}
				this.x = result.newX;
			} else {
				this.x += this.xdir * this.xspeed;
			}
		} else if ((this.xdir * this.xspeed) < 0) {
			if (!tileMap.canMove(this.spriteInfo, "left", this.x, this.y)) {
				var result = tileMap.spriteMinX(this.spriteInfo, this.x, this.xdir * this.xspeed);
				if (result.fixed) {
					this.xdir = -this.xdir;
				}
				this.x = result.newX;
			} else {
				this.x += this.xdir * this.xspeed;
			}
		}

		if (this.yspeed > 0) {
			if (!tileMap.canMove(this.spriteInfo, "down", this.x, this.y)) {
				var tileY = Math.ceil((this.y + this.spriteInfo.by1) / tileMap.tileSize);
				var maxY = tileY * tileMap.tileSize;

				this.y += this.yspeed;
				if ((this.y + this.spriteInfo.by1) > maxY) {
					this.y = maxY - this.spriteInfo.by1;
					this.yspeed = 0;
					this.jumping = false;
					this.falling = false;
				}
			} else {
				this.y += this.yspeed;
			}
		} else if (this.yspeed < 0) {
			if (!tileMap.canMove(this.spriteInfo, "up", this.x, this.y)) {
				this.yspeed = gravity * 10;
				this.y += this.yspeed;
				var tileY = Math.ceil((this.y + this.spriteInfo.by1) / tileMap.tileSize);
				this.y = Math.floor(tileY * tileMap.tileSize - this.spriteInfo.by1);
			} else {
				this.y += this.yspeed;
			}
		}
		return false;
	}

	this.draw = function(mapXPos) {
		gl.vertexAttribPointer(this.shader.attribute("aPosition"), 2, gl.FLOAT, false, 4 * 4, 0);
		gl.vertexAttribPointer(this.shader.attribute("aTexture"), 2, gl.FLOAT, false, 4 * 4, 2 * 4);
		gl.uniform2fv(this.shader.uniform("pos"), [Math.floor(this.x - mapXPos), Math.floor(this.y)]);
		gl.drawArrays(gl.TRIANGLES, this.spriteInfo.index, 6);
	}
}

/**************************************************************************************************************
 * Helper
 **************************************************************************************************************/
function objectProperty(objectInfo, name) {
	if (objectInfo) {
		if (objectInfo.properties) {
			return objectInfo.properties[name];
		}
	}
	return null;
}

/**************************************************************************************************************
 * Intro 1 Boss
 **************************************************************************************************************/
function Intro1Boss(game, shader, spriteVertexBuffer, tileMap, x, y, callback) {
	this.game = game;
	this.shader = shader;
	this.spriteVertexBuffer = spriteVertexBuffer;
	this.tileMap = tileMap;
	this.x = x;
	this.y = y;
	this.callback = callback;
	this.outOfScreenDestroy = false;
	this.visible = true;
	this.xspeed = -0.5;
	this.xaccel = -0.01;
	this.yspeed = 0.1;
	this.yaccel = 0.011;
	this.xframe = 0;
	this.delayCounter = 80;
	this.xTurnCounter = 0;
	this.isDone = false;

	this.updateSpriteInfo = function() {
		var walkCycle = Math.floor((this.xframe / 8) % 3);
		return constants["INTRO1_BOSS_" + walkCycle + (this.spriteInfoMirror ? "_M" : "")];
	}

	this.spriteInfo = this.updateSpriteInfo();
	this.spriteInfoTop = constants["INTRO1_BOSS_TOP"];
	this.spriteInfoMirror = false;

	this.sign = function(x) {
		return x?x<0?-1:1:0
	}

	this.done = function() {
		this.isDone = true;
	}

	this.update = function(mapXPos) {
		this.xframe++;
		this.spriteInfo = this.updateSpriteInfo();

		this.delayCounter -= 1;
		if (this.delayCounter > 0) {
			return false;
		}
		if (this.callback) {
			this.callback(this);
			this.callback = undefined;
		}
		this.x += this.xspeed;
		this.y += this.yspeed;

		var old = this.xspeed;
		this.xspeed += this.xaccel;
		if (this.sign(old) != this.sign(this.xspeed)) {
			this.spriteInfoMirror = !this.spriteInfoMirror;
			this.xTurnCounter += 1;
			if (this.xTurnCounter == 1) {
				this.xaccel = this.sign(this.xaccel) * 0.012;
			}
		}
		this.yspeed += this.yaccel;

		if (Math.abs(this.xspeed) > 2) {
			this.xaccel = -this.xaccel;
		}
		if (Math.abs(this.yspeed) > 1) {
			this.yaccel = -this.yaccel;
		}
		return this.isDone;
	}

	this.draw = function(mapXPos) {
		// the bind is necessary for the case that we display the IntroText that might mess up our bindings
		gl.bindBuffer(gl.ARRAY_BUFFER, spriteVertexBuffer);

		gl.vertexAttribPointer(this.shader.attribute("aPosition"), 2, gl.FLOAT, false, 4 * 4, 0);
		gl.vertexAttribPointer(this.shader.attribute("aTexture"), 2, gl.FLOAT, false, 4 * 4, 2 * 4);
		gl.uniform2fv(this.shader.uniform("pos"), [Math.floor(this.x - mapXPos), Math.floor(this.y)]);
		gl.drawArrays(gl.TRIANGLES, this.spriteInfo.index, 6);

		var roofXOffset = 18;
		if (this.spriteInfoMirror) {
			roofXOffset = 0;
		}
		gl.uniform2fv(this.shader.uniform("pos"), [Math.floor(this.x - mapXPos + roofXOffset), Math.floor(this.y - 10)]);
		gl.drawArrays(gl.TRIANGLES, this.spriteInfoTop.index, 6);
	}
}

/**************************************************************************************************************
 * Boss
 **************************************************************************************************************/
function Boss(game, shader, spriteVertexBuffer, tileMap, callback, goneCallback) {
	this.game = game;
	this.shader = shader;
	this.spriteVertexBuffer = spriteVertexBuffer;
	this.tileMap = tileMap;
	this.spriteInfo = constants["BOSS"];
	this.spriteFaceL = constants["BOSS_FACE_L"];
	this.spriteFaceR = constants["BOSS_FACE_R"];
	this.spriteFace = this.spriteFaceL;
	this.spriteFaceHit = constants["BOSS_FACE_HIT"];
	this.spriteEngineLL = constants["BOSS_ENGINE_L_LOW"];
	this.spriteEngineRL = constants["BOSS_ENGINE_R_LOW"];
	this.spriteEngineLH = constants["BOSS_ENGINE_L_HIGH"];
	this.spriteEngineRH = constants["BOSS_ENGINE_R_HIGH"];
	this.spriteKill1 = constants["BOSS_KILL_1"];
	this.spriteKill2 = constants["BOSS_KILL_2"];
	this.spriteKill3 = constants["BOSS_KILL_3"];
	this.spriteKill4 = constants["BOSS_KILL_4"];
	this.spriteKill5 = constants["BOSS_KILL_5"];
	this.spriteKill6 = constants["BOSS_KILL_6"];
	this.x = glWidth / 2 - this.spriteInfo.width / 2;
	this.y = -this.spriteInfo.height;
	this.enemy = true;
	this.outOfScreenDestroy = false;
	this.collidable = true;
	this.callback = callback;
	this.goneCallback = goneCallback;
	this.visible = true;
	this.xspeed = -0.5;
	this.xaccel = -0.01;
	this.yspeed = 0.1;
	this.yaccel = 0.015;
	this.xframe = 0;
	this.delayCounter = 100;
	this.xTurnCounter = 0;
	this.isDone = false;
	this.yStartSpeed = 4.5;
	this.spriteEngineLeft = this.spriteEngineLL;
	this.spriteEngineRight = this.spriteEngineRL;
	this.hitCounter = 10;
	this.isDying = false;
	this.shakeCounter = 60 * 3;
	this.killPos = [];
	this.objectInfo = {
     	"height":64,
     	"properties": {},
     	"type":"boss",
     	"width":128
    };

	this.sign = function(x) {
		return x?x<0?-1:1:0
	}

	this.done = function() {
		this.isDone = true;
		if (this.goneCallback) {
			this.game.score.bossKill();
			this.goneCallback(this);
			this.goneCallback = undefined;
		}
	}

	this.randomXValue = function() {
		return Math.random() * 4 - 2;
	}

	this.randomYValue = function() {
		return Math.random() * 6 - 8;
	}

	this.startDying = function() {
		this.isDying = true;
		this.killPos[0] = {	x:this.x +  0, y:this.y, xs:this.randomXValue(), ys:this.randomYValue() };
		this.killPos[1] = {	x:this.x + 32, y:this.y, xs:this.randomXValue(), ys:this.randomYValue() };
		this.killPos[2] = {	x:this.x + 64, y:this.y, xs:this.randomXValue(), ys:this.randomYValue() };
		this.killPos[3] = {	x:this.x + 96, y:this.y, xs:this.randomXValue(), ys:this.randomYValue() };
		this.killPos[4] = {	x:this.x + 32, y:this.y + 32, xs:this.randomXValue(), ys:this.randomYValue() };
		this.killPos[5] = {	x:this.x + 64, y:this.y + 32, xs:this.randomXValue(), ys:this.randomYValue() };
	}

	this.makeFlat = function() {
		if (this.hit) {
			return false;
		}
		this.hit = true;
		this.hitTime = 60;
		this.hitCounter -= 1;
		if (this.hitCounter < 0) {
			this.startDying();
		}
		return false;
	}

	this.updateStart = function(mapXPos) {
		if (!this.callback) {
			return false;
		}
		this.delayCounter -= 1;
		if (this.delayCounter > 0) {
			this.yStartSpeed -= 0.05;
			if (this.yStartSpeed < 0) {
				this.yStartSpeed = 0;
			}
			this.y += this.yStartSpeed;
			return false;
		}
		if (this.callback) {
			this.callback(this);
			this.callback = undefined;
		}
		return false;
	}

	this.resetOwlTimer = function() {
		this.owlTimer = Math.random() * 60 * 3 + 60;
	}

	this.startFight = function(player) {
		// player left or right of us?
		if (player.x > this.x) {
			this.xspeed = 2.0;
			this.xaccel = 0.01;
		} else {
			this.xspeed = -2.0;
			this.xaccel = -0.01;
		}
		this.yspeed = 1.0;
 		this.update = this.updateFight;
		this.freshFight = true;
		this.freshFightCounter = 60 * 3;
		this.resetOwlTimer();
	}

	this.updateFight = function(mapXPos) {
		if (this.isDying) {
			this.spriteFace = this.spriteFaceHit;
			this.spriteEngineLeft = undefined;
			this.spriteEngineRight = undefined;

			this.shakeCounter -= 1;
			if (this.shakeCounter < 0) {
				this.spriteFace = undefined;
				var outOfScreenCounter = 0;
				for (i=0; i<this.killPos.length; i++) {
					this.killPos[i].x += this.killPos[i].xs;
					this.killPos[i].y += this.killPos[i].ys;
					this.killPos[i].ys += 0.15;

					if (this.killPos[i].y > glHeight) {
						outOfScreenCounter += 1;
					}
				}
				if (outOfScreenCounter == 6) {
					this.done();
				}
			}
			return this.isDone;
		}
		this.x += this.xspeed;
		this.y += this.yspeed;

		if (this.freshFight) {
			this.y -= 0.5;
			this.freshFightCounter -= 1;
			if (this.freshFightCounter < 0) {
				this.freshFight = false;
			}
		}

		this.xspeed += this.xaccel;
		this.yspeed += this.yaccel;

		if (Math.abs(this.xspeed) > 2) {
			this.xaccel = -this.xaccel;
		}

		if (Math.abs(this.yspeed) > 1.0) {
			this.yaccel = -this.yaccel;
		}

		var sign = this.sign(this.xspeed);
		if (sign < 0) {
			this.spriteFace = this.spriteFaceL;
			this.spriteEngineLeft = this.spriteEngineLL;
			this.spriteEngineRight = this.spriteEngineRH;
		} else if (sign > 0) {
			this.spriteFace = this.spriteFaceR;
			this.spriteEngineLeft = this.spriteEngineLH;
			this.spriteEngineRight = this.spriteEngineRL;
		} else {
			this.spriteFace = this.spriteFaceL;
			this.spriteEngineLeft = undefined;
			this.spriteEngineRight = undefined;
		}

		if (this.hit) {
			this.spriteFace = this.spriteFaceHit;
			this.spriteEngineLeft = undefined;
			this.spriteEngineRight = undefined;

			this.hitTime -= 1;
			if (this.hitTime < 0) {
				this.hit = false;
			}
		}

		this.owlTimer -= 1;
		if (this.owlTimer < 0) {
			var owlInfo = {
		     	"height":32,
		     	"properties": {},
		     	"type":"enemy",
		     	"width":32,
				"x":this.x + 64 - 16,
				"y":this.y + 32
		    };
			var owl = new Enemy(this.game, this.shader, this.tileMap, owlInfo);
			owl.removeOnFlat = true;
			this.game.addObject(owl);
			this.resetOwlTimer();
		}
		return this.isDone;
	}

	this.draw = function(mapXPos) {
		// the bind is necessary for the case that we display the IntroText that might mess up our bindings
		gl.bindBuffer(gl.ARRAY_BUFFER, spriteVertexBuffer);

		gl.vertexAttribPointer(this.shader.attribute("aPosition"), 2, gl.FLOAT, false, 4 * 4, 0);
		gl.vertexAttribPointer(this.shader.attribute("aTexture"), 2, gl.FLOAT, false, 4 * 4, 2 * 4);

		if (this.isDying) {
			var shakeX = Math.random() * 10 - 5 - mapXPos;
			var shakeY = Math.random() * 10 - 5 - mapXPos;

			gl.uniform2fv(this.shader.uniform("pos"), [this.killPos[0].x + shakeX, this.killPos[0].y + shakeY]);
			gl.drawArrays(gl.TRIANGLES, this.spriteKill1.index, 6);

			gl.uniform2fv(this.shader.uniform("pos"), [this.killPos[1].x + shakeX, this.killPos[1].y + shakeY]);
			gl.drawArrays(gl.TRIANGLES, this.spriteKill2.index, 6);

			gl.uniform2fv(this.shader.uniform("pos"), [this.killPos[2].x + shakeX, this.killPos[2].y + shakeY]);
			gl.drawArrays(gl.TRIANGLES, this.spriteKill3.index, 6);

			gl.uniform2fv(this.shader.uniform("pos"), [this.killPos[3].x + shakeX, this.killPos[3].y + shakeY]);
			gl.drawArrays(gl.TRIANGLES, this.spriteKill4.index, 6);

			gl.uniform2fv(this.shader.uniform("pos"), [this.killPos[4].x + shakeX, this.killPos[4].y + shakeY]);
			gl.drawArrays(gl.TRIANGLES, this.spriteKill5.index, 6);

			gl.uniform2fv(this.shader.uniform("pos"), [this.killPos[5].x + shakeX, this.killPos[5].y + shakeY]);
			gl.drawArrays(gl.TRIANGLES, this.spriteKill6.index, 6);

			if (this.spriteFace) {
				gl.uniform2fv(this.shader.uniform("pos"), [this.killPos[0].x + shakeX + 52, this.killPos[0].y + shakeY + 11]);
				gl.drawArrays(gl.TRIANGLES, this.spriteFace.index, 6);
			}

			return;
		}
		var xpos = Math.floor(this.x - mapXPos);
		var ypos = Math.floor(this.y);

		gl.uniform2fv(this.shader.uniform("pos"), [xpos, ypos]);
		gl.drawArrays(gl.TRIANGLES, this.spriteInfo.index, 6);

		if (this.spriteFace) {
			gl.uniform2fv(this.shader.uniform("pos"), [xpos + 52, ypos + 11]);
			gl.drawArrays(gl.TRIANGLES, this.spriteFace.index, 6);
		}

		this.xframe += 1;
		if (this.xframe % 4 > 2) {
			if (this.spriteEngineLeft) {
				gl.uniform2fv(this.shader.uniform("pos"), [xpos + 34, ypos + 42]);
				gl.drawArrays(gl.TRIANGLES, this.spriteEngineLeft.index, 6);
			}

			if (this.spriteEngineRight) {
				gl.uniform2fv(this.shader.uniform("pos"), [xpos + 83, ypos + 42]);
				gl.drawArrays(gl.TRIANGLES, this.spriteEngineRight.index, 6);
			}
		}
	}

	this.update = this.updateStart;
}

/**************************************************************************************************************
 * Switch
 **************************************************************************************************************/
function Switch(game, shader, tileMap, objectInfo) {
	this.game = game;
	this.shader = shader;
	this.tileMap = tileMap;
	this.objectInfo = objectInfo;
	this.outOfScreenDestroy = false;
	this.collidable = true;
	this.x = objectInfo.x;
	this.y = objectInfo.y;
	this.spriteInfo;
	this.blinkframe = 0;
	this.blinks;
	this.blinkVisible = true;
	this.action = objectProperty(objectInfo, "action");
	this.isDone = false;
	this.visible = true;
	this.delay = 0;

	this.done = function() {
		this.isDone = true;
	}

	this.update = function(mapXPos) {
		if (this.blinks) {
			this.blinkframe += 1;
			if (this.blinkframe > this.blinks) {
				this.blinkVisible = !this.blinkVisible;
				this.blinkframe = 0;
			}
		}
		if (this.delay && this.delay > 0) {
			this.delay -= 1;
			this.visible = false;
		} else {
			this.visible = true;
		}
		return this.isDone;
	}

	this.draw = function(mapXPos) {
		if (this.isDone) {
			return;
		}
		if (!this.visible) {
			return;
		}
		if (!this.spriteInfo.index) {
			return;
		}
		if (!this.blinkVisible) {
			return;
		}
		gl.vertexAttribPointer(this.shader.attribute("aPosition"), 2, gl.FLOAT, false, 4 * 4, 0);
		gl.vertexAttribPointer(this.shader.attribute("aTexture"), 2, gl.FLOAT, false, 4 * 4, 2 * 4);
		gl.uniform2fv(this.shader.uniform("pos"), [Math.floor(this.x - mapXPos), Math.floor(this.y)]);
		gl.drawArrays(gl.TRIANGLES, this.spriteInfo.index, 6);
	}

	var sprite = objectProperty(objectInfo, "sprite");
	if (sprite) {
		this.spriteInfo = constants[sprite];
	} else {
		this.spriteInfo = {
			width : objectInfo.width,
			height : objectInfo.height,
			bx0 : 0,
			by0 : 0,
			bx1 : objectInfo.width,
			by1 : objectInfo.height
		};
	}

	var blinkProp = objectProperty(objectInfo, "blinks");
	if (blinkProp) {
		this.blinks = blinkProp;
		this.blinkVisible = false;
	}

	this.delay = objectProperty(objectInfo, "delay");
}

/**************************************************************************************************************
 * PlayerEnd
 **************************************************************************************************************/
function PlayerEnd(game, tileMap, objectInfo) {
	this.game = game;
	this.tileMap = tileMap;
	this.objectInfo = objectInfo;
	this.outOfScreenDestroy = false;
	this.collidable = true;
	this.x = objectInfo.x;
	this.y = objectInfo.y;
	this.isDone = false;
	this.visible = true;

	this.done = function() {
		this.isDone = true;
	}

	this.update = function(mapXPos) {
		return this.isDone;
	}

	this.draw = function(mapXPos) {
	}

	this.spriteInfo = {
		width : this.objectInfo.width,
		height : this.objectInfo.height,
		bx0 : 0,
		by0 : 0,
		bx1 : this.objectInfo.width,
		by1 : this.objectInfo.height
	}
}

/**************************************************************************************************************
 * general collision helper method
 **************************************************************************************************************/
function objectCollision(objectAx, objectAy, objectASpriteInfo, objectBx, objectBy, objectBSpriteInfo) {
	if (!objectASpriteInfo) {
		return false;
	}
	if (!objectBSpriteInfo) {
		return false;
	}
	var aLeft   =         Math.floor(objectAx + objectASpriteInfo.bx0);
	var aTop    =         Math.floor(objectAy + objectASpriteInfo.by0);
	var aRight  = aLeft + Math.floor(objectASpriteInfo.bx1 - objectASpriteInfo.bx0);
	var aBottom = aTop  + Math.floor(objectASpriteInfo.by1 - objectASpriteInfo.by0);
	var bLeft   =         Math.floor(objectBx + objectBSpriteInfo.bx0);
	var bTop    =         Math.floor(objectBy + objectBSpriteInfo.by0);
	var bRight  = bLeft + Math.floor(objectBSpriteInfo.bx1 - objectBSpriteInfo.bx0);
	var bBottom = bTop  + Math.floor(objectBSpriteInfo.by1 - objectBSpriteInfo.by0);
	var result = ! ( bLeft > aRight || bRight < aLeft || bTop > aBottom || bBottom < aTop );
	if (false) {
		console.log("checking (" + aLeft + "," + aTop + "," + aRight + "," + aBottom + ") vs. (" +
                               	   bLeft + "," + bTop + "," + bRight + "," + bBottom + ") => " + result);
	}
	return result;
}
    