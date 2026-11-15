// Display only. Continuous CC0 human mesh. The existing page supplies every status.
(function(root){
  "use strict";
  var T=root.THREE,st=null;
  var TOK={ok:"--accent",expected:"--expected",changed:"--changed",watch:"--watch",serious:"--serious",cannot:"--cannot"};
  var anchors={head:[0,1.52,.34],chest:[0,.90,.27],core:[0,.40,.285],arm:[-.88,.49,.35]};
  function unpack(s,Type){var a=atob(s),b=new Uint8Array(a.length);for(var i=0;i<a.length;i++)b[i]=a.charCodeAt(i);return new Type(b.buffer);}
  function build(){
    var d=root.HUMAN_MESH;if(!d)throw new Error("Human mesh unavailable");
    var g=new T.BufferGeometry();g.setAttribute("position",new T.BufferAttribute(unpack(d.positions,Float32Array),3));
    g.setIndex(new T.BufferAttribute(unpack(d.indices,Uint16Array),1));g.scale(2,2,2);g.translate(0,-1.78,0);g.computeVertexNormals();
    var mat=new T.ShaderMaterial({
      uniforms:{tint:{value:new T.Color("#59cfdc")}},
      vertexShader:"varying vec3 vN; varying vec3 vV; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
      fragmentShader:"uniform vec3 tint; varying vec3 vN; varying vec3 vV; void main(){vec3 n=normalize(vN);float rim=pow(1.0-max(dot(n,normalize(vV)),0.0),2.3);float light=max(dot(n,normalize(vec3(-.5,.8,1.0))),0.0);gl_FragColor=vec4(tint*(.12+.23*light+1.1*rim),1.0);}"
    });
    st.mesh=new T.Mesh(g,mat);st.body.add(st.mesh);
    Object.keys(anchors).forEach(function(reg){
      var dot=new T.Mesh(new T.SphereGeometry(.045,12,10),new T.MeshBasicMaterial({color:"#7ce8ec",depthTest:false}));
      dot.position.fromArray(anchors[reg]);dot.renderOrder=3;
      var halo=new T.Mesh(new T.SphereGeometry(.10,16,12),new T.MeshBasicMaterial({color:"#7ce8ec",transparent:true,opacity:.2,depthTest:false}));
      halo.position.copy(dot.position);halo.renderOrder=2;st.body.add(dot,halo);
      var label=document.createElement("span");label.className="twinlabel";label.setAttribute("aria-hidden","true");st.stage.appendChild(label);
      st.regions[reg]={dot:dot,halo:halo,label:label};
    });
  }
  function place(){
    var w=st.stage.clientWidth,h=st.stage.clientHeight;
    Object.keys(st.regions).forEach(function(reg){var r=st.regions[reg];r.dot.getWorldPosition(st.v);st.v.project(st.camera);r.x=(st.v.x*.5+.5)*w;r.y=(-st.v.y*.5+.5)*h;r.label.style.transform="translate("+r.x.toFixed(1)+"px,"+r.y.toFixed(1)+"px) translate(-50%,12px)";});
  }
  function draw(){if(!st||st.lost||!st.stage.clientWidth)return;st.body.updateMatrixWorld(true);place();st.renderer.render(st.scene,st.camera);}
  function size(){if(!st||st.lost)return;var w=st.stage.clientWidth,h=st.stage.clientHeight;if(!w||!h)return;st.renderer.setSize(w,h,false);st.camera.aspect=w/h;st.camera.position.z=Math.max(6.4,4.25/(w/h));st.camera.updateProjectionMatrix();draw();}
  function at(e){
    var r=st.canvas.getBoundingClientRect();if(!r.width||!r.height)return null;place();var near=null,dist=Infinity;
    Object.keys(st.regions).forEach(function(reg){var p=st.regions[reg],d=Math.hypot(e.clientX-r.left-p.x,e.clientY-r.top-p.y);if(d<dist){dist=d;near=reg;}});
    if(dist<28)return near;
    st.ptr.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);st.ray.setFromCamera(st.ptr,st.camera);
    var hit=st.ray.intersectObject(st.mesh)[0];if(!hit)return null;var p=st.body.worldToLocal(hit.point.clone());
    if(p.y>1.13)return "head";if(Math.abs(p.x)>.52&&p.y>-.65)return "arm";if(p.y>.34)return "chest";return "core";
  }
  root.TWIN3D={
    init:function(stage,onPick){
      if(st)return true;if(!T||!stage||/[?&]no3d=1/.test(location.search))return false;
      var ren;
      try{
        ren=new T.WebGLRenderer({antialias:true,alpha:true});
        st={stage:stage,renderer:ren,canvas:ren.domElement,scene:new T.Scene(),body:new T.Group(),regions:{},ray:new T.Raycaster(),ptr:new T.Vector2(),v:new T.Vector3(),lost:false};
        st.camera=new T.PerspectiveCamera(35,1,.1,50);st.camera.position.set(0,.06,7.5);st.camera.lookAt(0,.03,0);st.scene.add(st.body);st.body.rotation.y=.22;
        ren.setPixelRatio(Math.min(devicePixelRatio||1,2));ren.setClearColor(0,0);st.canvas.setAttribute("aria-hidden","true");build();stage.appendChild(st.canvas);stage.classList.add("has3d");size();
      }catch(e){if(ren)ren.dispose();if(st)Object.keys(st.regions).forEach(function(r){st.regions[r].label.remove();});st=null;stage.classList.remove("has3d");return false;}
      if(root.ResizeObserver)new ResizeObserver(size).observe(stage);root.addEventListener("resize",size);
      var start=null,drag=false;
      st.canvas.addEventListener("pointerdown",function(e){start={x:e.clientX,y:e.clientY,rot:st.body.rotation.y};drag=false;st.canvas.setPointerCapture(e.pointerId);});
      st.canvas.addEventListener("pointermove",function(e){if(start){var dx=e.clientX-start.x;if(Math.abs(dx)>4||Math.abs(e.clientY-start.y)>4)drag=true;if(drag){st.body.rotation.y=start.rot+dx*.009;draw();}}else st.canvas.style.cursor=at(e)?"pointer":"grab";});
      st.canvas.addEventListener("pointerup",function(e){if(!drag){var reg=at(e);if(reg&&onPick)onPick(reg);}start=null;});
      st.canvas.addEventListener("pointercancel",function(){start=null;});
      st.canvas.addEventListener("webglcontextlost",function(e){e.preventDefault();st.lost=true;stage.classList.remove("has3d");});
      return true;
    },
    update:function(info,selected){if(!st)return;Object.keys(st.regions).forEach(function(reg){var i=info[reg],r=st.regions[reg];if(!i)return;var col=getComputedStyle(document.documentElement).getPropertyValue(TOK[i.cls]||"--accent").trim()||"#7ce8ec";r.dot.material.color.set(col);r.halo.material.color.set(col);r.halo.scale.setScalar(reg===selected?1.65:1);r.halo.material.opacity=reg===selected?.36:.14;r.label.textContent=i.label;r.label.className="twinlabel s-"+i.cls+(reg===selected?" sel":"");});draw();},
    screenPos:function(reg){if(!st||!st.regions[reg])return null;place();var r=st.canvas.getBoundingClientRect();return{x:r.left+st.regions[reg].x,y:r.top+st.regions[reg].y};},
    state:function(){return st?{running:!st.lost,revision:T.REVISION,regions:Object.keys(st.regions),parts:1,model:"CC0 continuous human mesh",labels:Object.keys(st.regions).map(function(r){return st.regions[r].label.textContent;})}:null;}
  };
})(window);
