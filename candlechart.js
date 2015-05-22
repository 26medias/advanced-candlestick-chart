
(function() {
	var heatmapLayer = function(size, options) {
		this.options = _.extend({
			width:	0,
			height:	0,
			min:	0,
			max:	0
		}, options);
		
		this.canvas			= document.createElement("canvas");
		this.canvas.width	= this.options.width;
		this.canvas.height	= this.options.height;
		this.ctx 			= this.canvas.getContext('2d');
		this.imageData		= this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
		
		this.buf			= new ArrayBuffer(this.imageData.data.length);
		this.buf8			= new Uint8ClampedArray(this.buf);
		this.data			= new Uint32Array(this.buf);
	}
	heatmapLayer.prototype.addPoints = function(forecastPoints, x) {
		var scope = this;
		_.each(forecastPoints, function(point) {
			scope.inc(x, point);
		});
	}
	heatmapLayer.prototype.inc = function(x, y) {
		y = this.options.height - y;
		x = Math.round(x);
		y = Math.round(y);
		if (x<0||x>this.options.width||y<0||y>this.options.height) {return this;}
		var index			= y * this.options.width + x;
		this.data[index]++;
		return this;
	}
	heatmapLayer.prototype.map = function(x,in_min,in_max,out_min,out_max) {
		return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
	};
	heatmapLayer.prototype.setPixel = function(x, y, color) {
		// Y axis is reversed
		y = this.options.height - y;
		x = Math.round(x);
		y = Math.round(y);
		if (x<0||x>this.options.width||y<0||y>this.options.height) {return this;}
		var index			= y * this.options.width + x;
		this.data[index]	= (color.a << 24) | (color.b << 16) | (color.g << 8) | color.r;
		return this;
	}
	heatmapLayer.prototype.toRGB = function(hex) {
		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	};
	heatmapLayer.prototype.render = function(options) {
		options = _.extend({
			pass:	5,
			beta:	1.2,
			decay:	0.5,
			alpha:	0.5,
			size:	1
		}, options);
		
		
		// First we create the heatmap in arbitrary numbers
		
		/*
			x	= 5
			y	= 10
			w	= 20
			
			i	= y * w + x;
			i	= 10 * 20 + 5
			i	= 205
			205	= 10 * 20 + 5
			
			i	= 205
			y	= floor(i/w)
			x	= i-y
		*/
		var n;
		var i,j,k,px,index,weight;
		var l = this.data.length;
		var counter = 0;
		for (n=0;n<options.pass;n++) {
			for (i=0;i<l;i++) {
					var sum		= 0;
					var count	= 0;
					for (j=options.size*-1;j<=options.size;j++) {
						for (k=options.size*-1;k<=options.size;k++) {
							px		= {};
							px.y	= Math.floor(i/this.options.width);
							px.x	= (i-(px.y*this.options.width));
							
							px.x += k;
							px.y += j;
							
							if (px.x<0||px.x>this.options.width||px.y<0||px.y>this.options.height) {
								continue;
							}
							index	= px.y * this.options.width + px.x;
							
							weight	= Math.pow(options.size-Math.max(Math.abs(j),Math.abs(k)),options.beta);
							count	+= weight;
							sum		+= this.data[index]*weight;
							/*
							counter++;
							if (counter<50) {
								console.log('weight['+k+';'+j+']', weight);
							}
							*/
						}
					}
					this.data[i] = sum/count;
			}
		}
		
		
		
		// Now we check what is the range of the values
		var stats = {};
		stats.min = Number.POSITIVE_INFINITY;
		stats.max = Number.NEGATIVE_INFINITY;
		
		for (i=0;i<l;i++) {
			if (this.data[i] > stats.max) {
				stats.max = this.data[i];
			}
			if (this.data[i] < stats.min) {
				stats.min = this.data[i];
			}
		}
		
		// Now we convert the data to pixel values based on their range to create a heatmap
		var rainbow = new Rainbow();
		rainbow.setSpectrum('#000080', '#1D76A0', '#E99F16', '#990000');
		rainbow.setNumberRange(stats.min, stats.max);
		
		var hex,shade,color;
		var counter = 0;
		var neutral	= rainbow.colourAt(stats.min);
		for (i=0;i<l;i++) {
			shade			= this.map(this.data[i], stats.min, stats.max, 0, 255);
			hex				= rainbow.colourAt(shade);
			if (hex===neutral) {
				color			= {r:255,g:255,b:255};	// transparent, thanks to the multiply blend mode
			} else {
				color			= this.toRGB(hex);
			}
			
			this.data[i]	= (Math.max(options.alpha*shade, 30) << 24) | (color.b << 16) | (color.g << 8) | color.r;
		}
		
		this.imageData.data.set(this.buf8);
		this.ctx.putImageData(this.imageData, 0, 0);
	}
	
	
	
	
	
	
	
	
	
	
	var candlechart = function(canvas, options) {
		
		this.options	= _.extend({},options);
		this.canvas		= canvas;
		
		this.canvas.width	= $(this.canvas).parent().width();
		this.canvas.height	= 200;
		
		this.ctx 		= this.canvas.getContext('2d');
		this.imageData	= false;
		
		this.data		= {
			candles:	[],
			forecasts:	[],
			pixels:		[]
		};
		this.stats		= {};
		
		this.color		= {
			up:		{
				r:	0,
				g:	0,
				b:	0,
				a:	255
			},
			down:		{
				r:	200,
				g:	200,
				b:	200,
				a:	255
			}
		};
		
	};
	
	
	
	candlechart.prototype.map = function(x,in_min,in_max,out_min,out_max) {
		return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
	};
	
	candlechart.prototype.start = function() {
		if (!this.imageData) {
			this.imageData	= this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
		}
		this.width			= this.canvas.width;
		this.height			= this.canvas.height;
		this.buf			= new ArrayBuffer(this.imageData.data.length);
		this.buf8			= new Uint8ClampedArray(this.buf);
		this.data.pixels	= new Uint32Array(this.buf);
		return this;
	}
	candlechart.prototype.end = function() {
		this.imageData.data.set(this.buf8);
		this.ctx.putImageData(this.imageData, 0, 0);
		return this;
	}
	
	candlechart.prototype.setPixel = function(x, y, color) {
		// Y axis is reversed
		y = this.height - y;
		x = Math.round(x);
		y = Math.round(y);
		if (x<0||x>this.width||y<0||y>this.height) {return this;}
		var index				= y * this.width + x;
		this.data.pixels[index]	= (color.a << 24) | (color.b << 16) | (color.g << 8) | color.r;
		return this;
	}
	
	candlechart.prototype.rect = function(x, y, w, h, color) {
		var i,j;
		for (i=y;i<y+h;i++) {
			for (j=x;j<x+w;j++) {
				this.setPixel(j, i, color);
			}
		}
		
	}
	
	candlechart.prototype.drawCandle = function(candle, pos) {
		if (!candle.c) {
			return this;
		}
		var scope = this;
		
		// Calculate the points in px
		var pxCandle = {
			o:		this.map(candle.o, this.stats.min, this.stats.max, 0, this.height),
			h:		this.map(candle.h, this.stats.min, this.stats.max, 0, this.height),
			l:		this.map(candle.l, this.stats.min, this.stats.max, 0, this.height),
			c:		this.map(candle.c, this.stats.min, this.stats.max, 0, this.height),
			v:		0
		};
		
		// Calculate the x position
		var x = ( pos * this.options.display.candleWidthTotal ) + this.options.display.marginWidth;
		var w = this.options.display.candleWidthInner;
		
		// Calculate the body
		var body = {
			x:		x,
			y:		(candle.o>candle.c)?pxCandle.c:pxCandle.o,
			w:		w,
			h:		Math.abs(pxCandle.o-pxCandle.c),
			color:	(candle.o>candle.c)?this.color.down:this.color.up,
		}
		
		// Calculate the legs
		var high = {
			x:		( pos * this.options.display.candleWidthTotal ) + (this.options.display.candleWidthTotal-this.options.display.legWidth)/2,
			y:		(candle.o>candle.c)?pxCandle.o:pxCandle.c,
			w:		this.options.display.legWidth,
			h:		(candle.o>candle.c)?pxCandle.h-pxCandle.o:pxCandle.h-pxCandle.c,
			color:	body.color
		}
		var low = {
			x:		high.x,
			y:		pxCandle.l,
			w:		high.w,
			h:		(candle.o>candle.c)?pxCandle.c-pxCandle.l:pxCandle.o-pxCandle.l,
			color:	body.color
		}
		
		this.rect(body.x, body.y, body.w, body.h, body.color);
		this.rect(high.x, high.y, high.w, high.h, high.color);
		this.rect(low.x, low.y, low.w, low.h, low.color);
		
		return this;
	}
	candlechart.prototype.drawForecast = function(forecastPoints, pos) {
		if (forecastPoints.length==0) {
			return this;
		}
		var scope = this;
		
		// Calculate the x position
		var x = ( pos * this.options.display.candleWidthTotal ) + this.options.display.candleWidthTotal/2;
		
		_.each(forecastPoints, function(point) {
			scope.setPixel(x, scope.map(point, scope.stats.min, scope.stats.max, 0, scope.height), {
				r:	0,
				g:	0,
				b:	255,
				a:	255
			});
		});
		
		return this;
	}
	
	
	
	
	
	
	
	
	
	
	candlechart.prototype.candles = function(candles) {
		this.data.candles	= candles;
		return this;
	}
	candlechart.prototype.forecasts = function(forecasts) {
		this.data.forecasts	= forecasts;
		return this;
	}
	candlechart.prototype.getDataWindow = function(cursor, count) {
		var _end	= cursor+count;
		var l		= this.data.candles.length;
		var start, end;
		if (_end>=l) {
			var diff	= _end-l;
			start		= Math.max(0, cursor-diff);
			end			= l-1
		} else {
			start		= cursor;
			end			= cursor+count;
		}
		
		return {
			candles:	this.data.candles.slice(start, end),
			forecasts:	this.data.forecasts.slice(start, end)
		};
	}
	
	
	candlechart.prototype.computeDisplayParameters = function() {
		// Calculate the parameters
		this.options = _.extend(this.options, {
			display:	{
				candlesTotal:		220,
				marginPct:			20,		// % of a candle width
				marginWidth:		0,		// Will calculate after
				legPct:				5,		// % of a candle width
				legWidth:			0,		// Will calculate after
				candleWidthTotal:	0,		// Will calculate after
				candleWidthInner:	0,		// Will calculate after
			}
		});
		
		// The width in pixels of each candle (inclusing margins)
		this.options.display.candleWidthTotal	= this.width/this.options.display.candlesTotal;
		// The width of each margin in pixel
		this.options.display.marginWidth		= this.options.display.candleWidthTotal*this.options.display.marginPct/100;
		// The width of the inner candle (the candle body)
		this.options.display.candleWidthInner	= this.options.display.candleWidthTotal - this.options.display.marginWidth*2;
		// The width of the legs in pixel
		this.options.display.legWidth			= this.options.display.candleWidthTotal*this.options.display.legPct/100;
		
		return this;
	}
	
	candlechart.prototype.computeScaleParameters = function() {
		var scope = this;
		
		// Stats
		this.stats.min = Number.POSITIVE_INFINITY;
		this.stats.max = Number.NEGATIVE_INFINITY;
		
		_.each(this.data.window.candles, function(candle) {
			if (!candle.c) {	// no candle data, forecasted value
				return false;
			}
			if (candle.h > scope.stats.max) {
				scope.stats.max = candle.h;
			}
			if (candle.l < scope.stats.min) {
				scope.stats.min = candle.l;
			}
		});
		
		_.each(this.data.window.forecasts, function(forecastPoints) {
			_.each(forecastPoints, function(point) {
				if (typeof point !== 'number') {
					return false;
				}
				if (point > scope.stats.max) {
					scope.stats.max = point;
				}
				if (point < scope.stats.min) {
					scope.stats.min = point;
				}
			});
		});
		
		
		return this;
	}
	
	
	candlechart.prototype.mergeLayer = function(layer) {
		/*
		// Create a new canvas in memory
		var canvas		= document.createElement("canvas");
		canvas.width	= this.width;
		canvas.height	= this.height;
		
		var ctx 		= canvas.getContext('2d');
		var imageData	= ctx.getImageData(0, 0, canvas.width, canvas.height);
		
		var clampedArray = new Uint8ClampedArray(layerData.buffer);
		var data		= imageData.data;
		data.set(clampedArray);
		*/
		
		this.ctx.globalCompositeOperation = "multiply";
		this.ctx.drawImage(layer.canvas, 0, 0);
		
		/*
		var buf			= new ArrayBuffer(imageData.data.length);
		var buf8		= new Uint8ClampedArray(buf);
		var data		= new Uint32Array(buf);
		*/
		//this.imageData.data.set(this.buf8);
		//this.ctx.putImageData(this.imageData, 0, 0);
		
		/*
		var l = layerData.length;
		var i;
		for (i=0;i<l;i++) {
			var int_a = this.data.pixels[i];
			var int_b = layerData[i];
			var pix_a = {
				r:	int_a&0xFF,
				g:	(int_a>>8)&0xFF,
				b:	(int_a>>16)&0xFF,
				a:	(int_a>>24)&0xFF
			};
			var pix_b = {
				r:	int_b&0xFF,
				g:	(int_b>>8)&0xFF,
				b:	(int_b>>16)&0xFF,
				a:	(int_b>>24)&0xFF
			};
			var pix_c = {
				r:	(pix_a.r+pix_b.r)/2,
				g:	(pix_a.g+pix_b.g)/2,
				b:	(pix_a.b+pix_b.b)/2,
				a:	(pix_a.a+pix_b.a)/2
			};
			this.data.pixels[i] = (pix_c.a << 24) | (pix_c.b << 16) | (pix_c.g << 8) | pix_c.r;
		}
		*/
	}
	
	
	candlechart.prototype.render = function(cursor) {
		var scope = this;
		
		// Start drawing
		this.start();
		
		// Calculate the display parameters
		this.computeDisplayParameters();
		
		// Get the data window
		this.data.window = this.getDataWindow(cursor, this.options.display.candlesTotal);
		
		// Recalculate the scale parameters
		this.computeScaleParameters();
		
		// Draw each candle
		_.each(this.data.window.candles, function(candle, pos) {
			scope.drawCandle(candle, pos);
		});
		
		/*
		// Draw each forecast
		_.each(this.data.window.forecasts, function(forecastPoints, pos) {
			scope.drawForecast(forecastPoints, pos);
		});
		*/
		
		// Draw the forecast
		var heatmap	= new heatmapLayer(this.imageData.data.length, {
			width:	this.width,
			height:	this.height,
			min:	this.stats.min,
			max:	this.stats.max
		});
		_.each(this.data.window.forecasts, function(forecastPoints, pos) {
			heatmap.addPoints(_.map(forecastPoints, function(point) {
				return scope.map(point, scope.stats.min, scope.stats.max, 0, scope.height)
			}), pos * scope.options.display.candleWidthTotal + scope.options.display.candleWidthTotal/2);
		});
		heatmap.render({
			pass:	1,
			alpha:	1,
			size:	3,
			beta:	2
		});
		this.end();
		
		this.mergeLayer(heatmap);
		
		
		
		//this.fast2();
	}
	window.candlechart = candlechart;
})();