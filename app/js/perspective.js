(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Perspective = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright 2010 futomi  http://www.html5.jp/
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// perspective.js v0.0.2
// 2010-08-28
//
// This file was modified by Fabien LOISON <http://www.flozz.fr/>


/* -------------------------------------------------------------------
 * define objects (name space) for this library.
 * ----------------------------------------------------------------- */

var html5jp = window.html5jp || {};

(function() {

    /* -------------------------------------------------------------------
     * constructor
     * ----------------------------------------------------------------- */
    //ctx_crop_bg_p, image, ctx_crop_bg, iw, ih
    
    // dest_canvas_hi, source_image_hi, source_image_low 
    html5jp.perspective = function(dest_canvas_hi, source_image_hi, source_image_lo) {
        // ctxd - p source canvas 
        // image - source image

        // cvso - p canvas for the image
        // ctxo - p ctx of cvso
        // cvst - canvas for the transformed image
        // ctxt - p ctx of cvst

        // check the arguments
        //if( ! ctxd || ! ctxd.strokeStyle ) { return; }
        //if( ! image || ! image.width || ! image.height ) { return; }

        var ctxd = dest_canvas_hi;

        // prepare a <canvas> for the image
        var cvso_hi = document.createElement('canvas');
        var cvso_lo = document.createElement('canvas');
        cvso_hi.width = parseInt(source_image_hi.width);
        cvso_hi.height = parseInt(source_image_hi.height);
        cvso_lo.width = parseInt(source_image_lo.width);
        cvso_lo.height = parseInt(source_image_lo.height);

        var ctxo_hi = cvso_hi.getContext('2d', { alpha: false });
        ctxo_hi.drawImage(source_image_hi, 0, 0, cvso_hi.width, cvso_hi.height);
        var ctxo_lo = cvso_lo.getContext('2d', { alpha: false });
        ctxo_lo.drawImage(source_image_lo, 0, 0, cvso_lo.width, cvso_lo.height);
        
        // prepare a <canvas> for the transformed image
        var cvst_hi = document.createElement('canvas');
        cvst_hi.width = cvso_hi.width;
        cvst_hi.height = cvso_hi.height;
        var cvst_lo = document.createElement('canvas');
        cvst_lo.width = cvso_lo.width;
        cvst_lo.height = cvso_lo.height;
        var ctxt_hi = cvst_hi.getContext('2d');
        var ctxt_lo = cvst_lo.getContext('2d');

        var hi_lo_v_scale = cvso_lo.width / cvso_hi.width;
        var hi_lo_h_scale = cvso_lo.height / cvso_hi.height;
        var hi_v_change = ((( cvso_hi.height * 100) / 100) / 1000).toFixed(2);
        var hi_h_change = ((( cvso_hi.width * 100) / 100) / 1000).toFixed(2);

        this.p = {
            ctxd: ctxd,
            cvso_hi: cvso_hi,
            cvso_lo: cvso_lo,
            ctxo_hi: ctxo_hi,
            ctxo_lo: ctxo_lo,
            ctxt_hi: ctxt_hi,
            ctxt_lo: ctxt_lo,
            hi_lo_h_scale: hi_lo_h_scale,
            hi_lo_v_scale: hi_lo_v_scale,
            hi_h_change: hi_h_change,
            hi_v_change: hi_v_change,
        };
        
        //var ctxt = ctxd;

         //ctxt.imageSmoothingQuality = "low";
        // parameters
        /*
        this.p = {
            ctxd: ctxd,
            cvso: cvso,
            ctxo: ctxo,
            ctxt: ctxt
        };
        */
        
        this.cache = {};
        //this.dest_canvas = dest_canvas;
        //this.dest_w = dest_w;
        //this.dest_h = dest_h;
    };

    /*
    html5jp.perspective = function(ctxd, image, dest_canvas, dest_w, dest_h) {
        // ctxd - p source canvas 
        // image - source image

        // cvso - p canvas for the image
        // ctxo - p ctx of cvso
        // cvst - canvas for the transformed image
        // ctxt - p ctx of cvst

        console.log(dest_w + ' : ' + dest_h);
        console.log(image.width + ' : ' + image.height);
        // check the arguments
        if( ! ctxd || ! ctxd.strokeStyle ) { return; }
        if( ! image || ! image.width || ! image.height ) { return; }
        // prepare a <canvas> for the image
        var cvso = document.createElement('canvas');
        //cvso.imageSmoothingQuality = "low";
        cvso.width = parseInt(image.width);
        cvso.height = parseInt(image.height);
        var ctxo = cvso.getContext('2d', { alpha: false });
        //ctxo.imageSmoothingQuality = "low";
        ctxo.drawImage(image, 0, 0, cvso.width, cvso.height);
        // prepare a <canvas> for the transformed image

        var cvst = document.createElement('canvas');
        //cvst.imageSmoothingQuality = "low";
        
        cvst.width = ctxd.canvas.width;
        cvst.height = ctxd.canvas.height;
        var ctxt = cvst.getContext('2d');
        
        //var ctxt = ctxd;

         //ctxt.imageSmoothingQuality = "low";
        // parameters
        
        this.p = {
            ctxd: ctxd,
            cvso: cvso,
            ctxo: ctxo,
            ctxt: ctxt
        };
        
        this.cache = {};
        this.dest_canvas = dest_canvas;
        this.dest_w = dest_w;
        this.dest_h = dest_h;
    };
    */

    /* -------------------------------------------------------------------
     * prototypes
     * ----------------------------------------------------------------- */

    var proto = html5jp.perspective.prototype;

    /* -------------------------------------------------------------------
     * public methods
     * ----------------------------------------------------------------- */

   proto.draw = function(points, amount, quality) {
        // ctxd - p destination canvas 
        // image - source image
        // cvso - p canvas for the image
        // ctxo - p ctx of cvso
        // cvst - canvas for the transformed image
        // ctxt - p ctx of cvst
        /*
        this.p = {
            ctxd: ctxd,
            cvso_hi: cvso_hi,
            cvso_lo: cvso_lo,
            ctxo_hi: ctxo_hi,
            ctxo_lo: ctxo_lo,
            ctxt: ctxt
        };
        */
        console.log(this.p.ctxd);
        console.log(points + ' : ' + amount + ' : ' + quality);
 
        // clear the destination canvas
        //this.p.ctxd.setTransform(1, 0, 0, 1, 0, 0);

        //console.log(amount);
        var d0x = points[0][0];
        var d0y = points[0][1];
        var d1x = points[1][0];
        var d1y = points[1][1];
        var d2x = points[2][0];
        var d2y = points[2][1];
        var d3x = points[3][0];
        var d3y = points[3][1];
        // compute the dimension of each side
        var dims = [
            Math.sqrt( Math.pow(d0x-d1x, 2) + Math.pow(d0y-d1y, 2) ), // top side
            Math.sqrt( Math.pow(d1x-d2x, 2) + Math.pow(d1y-d2y, 2) ), // right side
            Math.sqrt( Math.pow(d2x-d3x, 2) + Math.pow(d2y-d3y, 2) ), // bottom side
            Math.sqrt( Math.pow(d3x-d0x, 2) + Math.pow(d3y-d0y, 2) )  // left side
                ];
        //
        if(quality == 'high'){
            var ow = this.p.cvso_hi.width;
            var oh = this.p.cvso_hi.height;
        } else {
            var ow = this.p.cvso_lo.width;
            var oh = this.p.cvso_lo.height;
        }
        
        // specify the index of which dimension is longest
        var base_index = 0;
        var max_scale_rate = 0;
        var zero_num = 0;
        for( var i=0; i<4; i++ ) {
            var rate = 0;
            if( i % 2 ) {
                rate = dims[i] / ow;
            } else {
                rate = dims[i] / oh;
            }
            if( rate > max_scale_rate ) {
                base_index = i;
                max_scale_rate = rate;
            }
            if( dims[i] == 0 ) {
                zero_num ++;
            }
        }
        if(zero_num > 1) { return; }
        //
        var step = 2;
        var cover_step = step * 5;
        //

             /*
        this.p = {
            ctxd: ctxd,
            cvso_hi: cvso_hi,
            cvso_lo: cvso_lo,
            ctxo_hi: ctxo_hi,
            ctxo_lo: ctxo_lo,
            ctxt: ctxt
        };
        */
        var cvso_hi = this.p.cvso_hi;
        var cvso_lo = this.p.cvso_lo;
        if(quality == 'high'){
        var ctxo = this.p.ctxo_hi;
         var ctxt = this.p.ctxt_hi;
    } else {
        console.log('lo');
        var ctxo = this.p.ctxo_lo;
        var ctxt = this.p.ctxt_lo;
    }
        var ctxd = this.p.ctxd;
       


        //ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height);
        if(base_index % 2 == 0) { // top or bottom side
            var ctxl = this.create_canvas_context(ow, cover_step);
             //var ctxl = this.create_canvas_context(cvso_hi.width, cvso_hi.height);
            ctxl.globalCompositeOperation = "copy";
            var cvsl = ctxl.canvas;
            for( var y=0; y<oh; y+=step ) {
                var r = y / oh;
                var sx = d0x + (d3x-d0x) * r;
                var sy = d0y + (d3y-d0y) * r;
                var ex = d1x + (d2x-d1x) * r;
                var ey = d1y + (d2y-d1y) * r;
                var ag = Math.atan( (ey-sy) / (ex-sx) );
                var sc = Math.sqrt( Math.pow(ex-sx, 2) + Math.pow(ey-sy, 2) ) / ow;
                ctxl.setTransform(1, 0, 0, 1, 0, -y);
                ctxl.drawImage(ctxo.canvas, 0, 0);
                //
                ctxt.translate(sx, sy);
                ctxt.rotate(ag);
                ctxt.scale(sc, sc);
                ctxt.drawImage(cvsl, 0, 0);
                //
                ctxt.setTransform(1, 0, 0, 1, 0, 0);
            }
        } else if(base_index % 2 == 1) { // right or left side
            var ctxl = this.create_canvas_context(cover_step, oh);
            //var ctxl = this.create_canvas_context(cvso_hi.height, cvso_hi.width);
            ctxl.globalCompositeOperation = "copy";
            var cvsl = ctxl.canvas;
            for( var x=0; x<ow; x+=step ) {
                var r =  x / ow;
                var sx = d0x + (d1x-d0x) * r;
                var sy = d0y + (d1y-d0y) * r;
                var ex = d3x + (d2x-d3x) * r;
                var ey = d3y + (d2y-d3y) * r;
                var ag = Math.atan( (sx-ex) / (ey-sy) );
                var sc = Math.sqrt( Math.pow(ex-sx, 2) + Math.pow(ey-sy, 2) ) / oh;
                ctxl.setTransform(1, 0, 0, 1, -x, 0);
                ctxl.drawImage(ctxo.canvas, 0, 0);
                //
                ctxt.translate(sx, sy);
                ctxt.rotate(ag);
                ctxt.scale(sc, sc);
                ctxt.drawImage(cvsl, 0, 0);
                //
                ctxt.setTransform(1, 0, 0, 1, 0, 0);
            }
        }
        // set a clipping path and draw the transformed image on the destination canvas.
        //this.p.ctxd.save();

console.log(cvso_hi.width + ' : ' + cvso_hi.height);
var update = this.p.ctxd.getContext('2d', { alpha: false });
           //this.dest_canvas.drawImage(ctxt.canvas, 0, 0, this.dest_w, this.dest_h);
         update.drawImage(ctxt.canvas, -cvso_hi.width/2, -cvso_hi.height/2, cvso_hi.width, cvso_hi.height);

        //this._applyMask(this.p.ctxd, [[d0x, d0y], [d1x, d1y], [d2x, d2y], [d3x, d3y]]);
        //this.p.ctxd.restore();

        return;
    };
/*
    proto.draw = function(points, amount, quality, w, h) {
        // ctxd - p destination canvas 
        // image - source image
        // cvso - p canvas for the image
        // ctxo - p ctx of cvso
        // cvst - canvas for the transformed image
        // ctxt - p ctx of cvst
        console.log(this.p.ctxd);
console.log(points + ' : ' + amount + ' : ' + quality + ' : ' + w + ' :' + h);
        //if(this.cache[points] == undefined){

            // clear the destination canvas
            this.dest_canvas.setTransform(1, 0, 0, 1, 0, 0);

        //console.log(amount);
        var d0x = points[0][0];
        var d0y = points[0][1];
        var d1x = points[1][0];
        var d1y = points[1][1];
        var d2x = points[2][0];
        var d2y = points[2][1];
        var d3x = points[3][0];
        var d3y = points[3][1];
        // compute the dimension of each side
        var dims = [
            Math.sqrt( Math.pow(d0x-d1x, 2) + Math.pow(d0y-d1y, 2) ), // top side
            Math.sqrt( Math.pow(d1x-d2x, 2) + Math.pow(d1y-d2y, 2) ), // right side
            Math.sqrt( Math.pow(d2x-d3x, 2) + Math.pow(d2y-d3y, 2) ), // bottom side
            Math.sqrt( Math.pow(d3x-d0x, 2) + Math.pow(d3y-d0y, 2) )  // left side
                ];
        //
        var ow = this.p.cvso.width;
        //console.log(ow);
        var oh = this.p.cvso.height;
        // specify the index of which dimension is longest
        var base_index = 0;
        var max_scale_rate = 0;
        var zero_num = 0;
        for( var i=0; i<4; i++ ) {
            var rate = 0;
            if( i % 2 ) {
                rate = dims[i] / ow;
            } else {
                rate = dims[i] / oh;
            }
            if( rate > max_scale_rate ) {
                base_index = i;
                max_scale_rate = rate;
            }
            if( dims[i] == 0 ) {
                zero_num ++;
            }
        }
        if(zero_num > 1) { return; }
        //
        var step = 2;
        var cover_step = step * 5;
        //
        var ctxo = this.p.ctxo;
        var ctxt = this.p.ctxt;

        var ctxd = this.p.ctxd;
console.log(ctxd);
        ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height);
        if(base_index % 2 == 0) { // top or bottom side
            var ctxl = this.create_canvas_context(ow, cover_step);
            ctxl.globalCompositeOperation = "copy";
            var cvsl = ctxl.canvas;
            for( var y=0; y<oh; y+=step ) {
                var r = y / oh;
                var sx = d0x + (d3x-d0x) * r;
                var sy = d0y + (d3y-d0y) * r;
                var ex = d1x + (d2x-d1x) * r;
                var ey = d1y + (d2y-d1y) * r;
                var ag = Math.atan( (ey-sy) / (ex-sx) );
                var sc = Math.sqrt( Math.pow(ex-sx, 2) + Math.pow(ey-sy, 2) ) / ow;
                ctxl.setTransform(1, 0, 0, 1, 0, -y);
                ctxl.drawImage(ctxo.canvas, 0, 0);
                //
                ctxt.translate(sx, sy);
                ctxt.rotate(ag);
                ctxt.scale(sc, sc);
                ctxt.drawImage(cvsl, 0, 0);
                //
                ctxt.setTransform(1, 0, 0, 1, 0, 0);
            }
        } else if(base_index % 2 == 1) { // right or left side
            var ctxl = this.create_canvas_context(cover_step, oh);
            ctxl.globalCompositeOperation = "copy";
            var cvsl = ctxl.canvas;
            for( var x=0; x<ow; x+=step ) {
                var r =  x / ow;
                var sx = d0x + (d1x-d0x) * r;
                var sy = d0y + (d1y-d0y) * r;
                var ex = d3x + (d2x-d3x) * r;
                var ey = d3y + (d2y-d3y) * r;
                var ag = Math.atan( (sx-ex) / (ey-sy) );
                var sc = Math.sqrt( Math.pow(ex-sx, 2) + Math.pow(ey-sy, 2) ) / oh;
                ctxl.setTransform(1, 0, 0, 1, -x, 0);
                ctxl.drawImage(ctxo.canvas, 0, 0);
                //
                ctxt.translate(sx, sy);
                ctxt.rotate(ag);
                ctxt.scale(sc, sc);
                ctxt.drawImage(cvsl, 0, 0);
                //
                ctxt.setTransform(1, 0, 0, 1, 0, 0);
            }
        }
        // set a clipping path and draw the transformed image on the destination canvas.
        this.p.ctxd.save();
        //console.log(this.cache[amount]);
        
        //if(quality == 'high'){
    // this.p.ctxd.drawImage(ctxt.canvas, 0, 0, this.dest_w, this.dest_h);
       //} else {
           this.dest_canvas.drawImage(ctxt.canvas, 0, 0, this.dest_w, this.dest_h);
        //}
        
        //
        this._applyMask(this.p.ctxd, [[d0x, d0y], [d1x, d1y], [d2x, d2y], [d3x, d3y]]);
        this.p.ctxd.restore();

        return;

    //} else {
     //   console.log('cached');
     //    this.dest_canvas.drawImage(this.cache[points], 0, 0, this.dest_w, this.dest_h);
        //this.p.ctxd.drawImage(this.cache[points], 0, 0);
    //}
    };
    */

    /* -------------------------------------------------------------------
     * private methods
     * ----------------------------------------------------------------- */

    proto.create_canvas_context = function(w, h) {
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d', { alpha: false });
        //ctx.imageSmoothingQuality = "low";
        return ctx;
    };

    proto._applyMask = function(ctx, points) {
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for( var i=1; i<points.length; i++ ) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.closePath();
        ctx.globalCompositeOperation = "destination-in";
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    };

})();


module.exports = html5jp.perspective;

},{}]},{},[1])(1)
});