(function() {
	var candlechart = function(canvas, options) {
		this.options	= _.extend({},options);
		this.canvas		= canvas;
		this.ctx 		= this.canvas.getContext('2d');
		
		this.imageData	= false;
		this.data		= false;
	};
	
	candlechart.prototype.destroy = function() {
		
	}
	
	candlechart.prototype.map = function(x,in_min,in_max,out_min,out_max) {
		return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
	};
	
	candlechart.prototype.getImageData = function() {
		if (!this.imageData) {
			this.imageData	= this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
			this.data		= this.imageData.data;
		}
		return this.imageData;
	};
	
	
	
	
	
	candlechart.prototype.rect = function(x, y, w, h) {
		
		if (!this.imageData) {
			this.imageData	= this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
			this.data		= this.imageData.data;
		}
		
		this.width	= this.canvas.width;
		this.height	= this.canvas.height;
		
		for (var y = 0; y < this.height; ++y) {
			for (var x = 0; x < this.width; ++x) {
				var index	= (y * this.width + x) * 4;
				var value	= x * y & 0xff;
				this.data[index]   = value;	// red
				this.data[++index] = value;	// green
				this.data[++index] = value;	// blue
				this.data[++index] = 255;	// alpha
			}
		}
		this.ctx.putImageData(this.imageData, 0, 0);
	}
	
	candlechart.prototype.render = function(data) {
		
		console.log("Canvas Size",{
			width: this.width,
			height:	this.height
		});
		
		this.rect();
	}
	window.candlechart = candlechart;
})();