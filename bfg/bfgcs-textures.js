function Textures() {
	this.textures = {};

	this.get = function(id) {
		return this.textures[id];
	}

	this.loadTexture = function(id, filename, type) {
		var texture = gl.createTexture();
		var image = new Image();
		image.crossOrigin = "";
		image.onload = function() {
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, type, type, gl.UNSIGNED_BYTE, image);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		}
		image.src = filename;
		this.textures[id] = texture;
	}

	this.loadTexture("../src/start.png", "start.png", gl.RGBA);
	this.loadTexture("../src/bfgcs-intro-1.png", "bfgcs-intro-1.png", gl.RGBA);
	this.loadTexture("../src/bfgcs-intro-2.png", "bfgcs-intro-2.png", gl.RGBA);
	this.loadTexture("../src/bfgcs-level-1.png", "bfgcs-level-1.png", gl.RGBA);
	this.loadTexture("../src/bfgcs-boss.png", "bfgcs-boss.png", gl.RGBA);
	this.loadTexture("font", "gessert_0.png", gl.RGBA);
	this.loadTexture("font-small", "gessert-small_0.png", gl.RGBA);
}
