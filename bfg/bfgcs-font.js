function Text(shader, fontTexture, bmFontDescriptor) {
	this.shader = shader;
	this.fontTexture = fontTexture;
	this.bmFontDescriptor = bmFontDescriptor;

	this.fontVertexPositionBuffer;
	this.fontVertexIndexBuffer;
	this.fontVertexIndices = new Array();
	this.vertices = new Array();
	this.currentText;

	this.red = 1.0;
	this.green = 1.0;
	this.blue = 1.0;
	this.alpha = 1.0;
	this.fadecounter = 0;
	this.fadetime = 1;
	this.startAlpha = 0;
	this.endAlpha = 1;

	this.blink = false;
	this.blinkOn = true;
	this.blinkTime = 0;
	this.blinkFrame = 0;

	this.initialize = function() {
		this.fontVertexIndexBuffer = gl.createBuffer();
		this.fontVertexPositionBuffer = gl.createBuffer();
	}

	this.enableFade = function(start, end, time) {
		this.startAlpha = start;
		this.endAlpha = end;
		this.fadetime = time;
		this.fadecounter = 0;
	}

	this.enableBlink = function(time) {
		if (this.blink) {
			return;
		}
		this.blink = true;
		this.blinkTime = time;
		this.blinkFrame = this.blinkTime;
	}

	this.disableBlink = function() {
		this.blink = false;
	}

	this.setColor = function(r, g, b, a) {
		this.red = r;
		this.green = g;
		this.blue = b;
		this.alpha = a;
	}

	this.setText = function(renderString) {
		this.currentText = renderString;
		var fontSizeFactor = 1.0;
		var vertices_i = 0;
		var textureCoords_i = 0;
		var indices_i = 0;
		var xOffset = 0;
		var yOffset = 0;
		var quadAmount = 0;

		this.vertices = new Array();
		this.fontVertexIndices = new Array();

		for (n = 0; n < renderString.length; n++) {
			if (renderString[n] == '\n') {
				xOffset = 0;
				yOffset += (bmFontDescriptor.lineHeight * fontSizeFactor);
				continue;
			}
			var letterDescriptor = this.bmFontDescriptor.getLetter(renderString[n]);
			if (!letterDescriptor) {
				continue;
			}
			var letterxOffset = letterDescriptor.xoffset * fontSizeFactor;
			var letteryOffset = (letterDescriptor.yoffset * fontSizeFactor);
			var letterxAdvance = letterDescriptor.xadvance * fontSizeFactor;

			// append the textureCoords for the current letter
			var textureCoords = (letterDescriptor.textureBuffer);

			// initialize P1
			this.vertices[vertices_i + 0] = 0 + xOffset + letterxOffset;
			this.vertices[vertices_i + 1] = (letterDescriptor.height * fontSizeFactor) + yOffset + letteryOffset;
			this.vertices[vertices_i + 2] = textureCoords[0];
			this.vertices[vertices_i + 3] = textureCoords[1];
			// initialize P2		
			this.vertices[vertices_i + 4] = (letterDescriptor.width * fontSizeFactor) + xOffset + letterxOffset;
			this.vertices[vertices_i + 5] = (letterDescriptor.height * fontSizeFactor) + yOffset + letteryOffset;
			this.vertices[vertices_i + 6] = textureCoords[2];
			this.vertices[vertices_i + 7] = textureCoords[3];
			// initialize P3		
			this.vertices[vertices_i +  8] = (letterDescriptor.width * fontSizeFactor) + xOffset + letterxOffset;
			this.vertices[vertices_i +  9] = 0 + yOffset + letteryOffset;
			this.vertices[vertices_i + 10] = textureCoords[4];
			this.vertices[vertices_i + 11] = textureCoords[5];
			// initialize P4		
			this.vertices[vertices_i + 12] = 0 + xOffset + letterxOffset;
			this.vertices[vertices_i + 13] = 0 + yOffset + letteryOffset;
			this.vertices[vertices_i + 14] = textureCoords[6];
			this.vertices[vertices_i + 15] = textureCoords[7];
			quadAmount++;

			xOffset += letterxAdvance;
			vertices_i += 16;

			// create vertex indices for the current letter
			var indices_offset = n * 4;

			this.fontVertexIndices[indices_i] = 0 + indices_offset;
			this.fontVertexIndices[indices_i + 1] = 1 + indices_offset;
			this.fontVertexIndices[indices_i + 2] = 2 + indices_offset;
			this.fontVertexIndices[indices_i + 3] = 0 + indices_offset;
			this.fontVertexIndices[indices_i + 4] = 2 + indices_offset;
			this.fontVertexIndices[indices_i + 5] = 3 + indices_offset;
			indices_i += 6;
		}

		// fill buffers with generated data
		gl.bindBuffer(gl.ARRAY_BUFFER, this.fontVertexPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
		this.fontVertexPositionBuffer.itemSize = 5;
		this.fontVertexPositionBuffer.numItems = quadAmount * 4;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.fontVertexIndexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.fontVertexIndices), gl.STATIC_DRAW);
		this.fontVertexIndexBuffer.itemSize = 1;
		this.fontVertexIndexBuffer.numItems = quadAmount * 6;
	}

	this.render = function(x, y) {
		if (this.fadecounter < this.fadetime) {
			this.fadecounter += 1;
		}
		this.alpha = this.startAlpha + (1.0 - (this.fadetime - this.fadecounter) / this.fadetime) * (this.endAlpha - this.startAlpha);

		if (this.blink) {
			this.blinkFrame -= 1;
			if (this.blinkFrame < 0) {
				this.blinkFrame = this.blinkTime;
				this.blinkOn = !this.blinkOn;
			}

			if (!this.blinkOn) {
				return;
			}
		}
		gl.bindTexture(gl.TEXTURE_2D, this.fontTexture);
		gl.uniform2fv(this.shader.uniform("pos"), [x, y]);
		gl.uniform4fv(this.shader.uniform("alpha"), [this.red, this.green, this.blue, this.alpha]);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.fontVertexPositionBuffer);
		gl.vertexAttribPointer(shader.attribute("aPosition"), 2, gl.FLOAT, false, 4*4, 0);
		gl.vertexAttribPointer(shader.attribute("aTexture"), 2, gl.FLOAT, false, 4*4, 2*4);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.fontVertexIndexBuffer);
		gl.drawElements(gl.TRIANGLES, this.fontVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		gl.uniform4fv(this.shader.uniform("alpha"), [1.0, 1.0, 1.0, 1.0]);
	}

	this.initialize();
}

function Font(fontTextureURL, fontTexture, shader) {
	this.fontTextureURL = fontTextureURL;
	this.shader = shader;
	this.bmFontDescriptor;
	this.fontTexture = fontTexture;

	this.parseBitmapFont = function() {
		this.bmFontDescriptor = new BitmapFontDescriptor(this.fontTextureURL);
		this.bmFontDescriptor.instantiate();
	}

	this.createText = function(string) {
		var result = new Text(this.shader, this.fontTexture, this.bmFontDescriptor);
		result.setText(string);
		return result;
	}

	this.parseBitmapFont();
}
