'use strict';
// v27: shared light emitters for a Deco sprite. No lighting data in decorations.json.
// Light coordinates are in original image pixels, matching the House light editor.
const DECO_LIGHT_STORE='tnvq_deco_lights_v27';
let decoLightConfigs=JSON.parse(JSON.stringify(ASSET_MANIFEST.decoLights||{}));
let decoLightEditor=null;
const decoLightUI=()=>document.getElementById('decoLightCanvas');
function decoLightKey(group,id){return `Deco/${group}/${id}`}
function decoLightValidConfig(lights,width=100000,height=100000){
 return normalizeHouseLights(Array.isArray(lights)?lights.slice(0,100):[],width,height);
}
function loadSavedDecoLightConfigs(){
 try{
  const saved=JSON.parse(localStorage.getItem(DECO_LIGHT_STORE)||'null');
  if(saved?.assets&&typeof saved.assets==='object'){
   for(const [name,list] of Object.entries(saved.assets)){
    if(/^Deco\/[A-Za-z][A-Za-z0-9_-]*\/[^/]+$/.test(name)&&Array.isArray(list))decoLightConfigs[name]=decoLightValidConfig(list);
   }
  }
 }catch(err){console.warn('Cannot restore Deco lights',err)}
}
loadSavedDecoLightConfigs();
function mergeDecoLightManifest(){
 const defaults=ASSET_MANIFEST.decoLights||{};
 for(const [name,list] of Object.entries(defaults))if(!(name in decoLightConfigs))decoLightConfigs[name]=decoLightValidConfig(list);
}
function lightsForDeco(item){return decoLightConfigs[decoLightKey(item.group,item.assetId)]||[]}
function drawDecoNightLights(){
 if(!simMode||!dayNight.enabled)return;
 const dark=1-daylightFactor();if(dark<=.02)return;
 for(const group of decoObjects.values())for(const obj of group){
  const lights=lightsForDeco(obj);if(!lights.length)continue;
  const image=decoImage(obj);if(!image?.naturalWidth)continue;
  const wx=(obj.tileX+.5)*TS+obj.x,wy=(obj.tileY+.5)*TS+obj.y;
  const s=toScreen(wx,wy),w=obj.width*zoom,h=obj.height*zoom;
  if(s.x+w<-150||s.x-w>vw+150||s.y+h<0||s.y-h>vh+150)continue;
  ctx.save();ctx.translate(s.x,s.y);ctx.rotate((obj.rotation||0)*Math.PI/180);
  const sx=w/image.naturalWidth,sy=h/image.naturalHeight;
  for(const light of lights)paintHouseLight(ctx,light,-w/2,-h,sx,sy,dark);
  ctx.restore();
 }
}
function decoLightSelected(){return decoLightEditor?.lights.find(l=>l.id===decoLightEditor?.selected)||null}
function decoLightCanvasXY(event){const canvas=decoLightUI(),r=canvas.getBoundingClientRect();return{x:(event.clientX-r.left)*canvas.width/r.width,y:(event.clientY-r.top)*canvas.height/r.height}}
function decoLightLayout(){
 const edit=decoLightEditor,img=edit?.image,canvas=decoLightUI();
 if(!edit||!img?.naturalWidth)return null;
 const scale=Math.min((canvas.width-78)/img.naturalWidth,(canvas.height-100)/img.naturalHeight);
 const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
 return{x:(canvas.width-w)/2,y:(canvas.height-h)/2+15,w,h,scale};
}
function decoLightRender(){
 const cv=decoLightUI(),g=cv.getContext('2d'),edit=decoLightEditor;if(!g||!edit)return;
 const W=cv.width,H=cv.height;g.clearRect(0,0,W,H);g.fillStyle='#17263c';g.fillRect(0,0,W,H);
 for(let y=0;y<H;y+=20)for(let x=0;x<W;x+=20)if(((x+y)/20)%2===0){g.fillStyle='#23364f';g.fillRect(x,y,20,20)}
 const lay=decoLightLayout();edit.layout=lay;
 if(!lay){g.fillStyle='#e5eefb';g.textAlign='center';g.font='bold 15px system-ui';g.fillText('Đang tải sprite...',W/2,H/2);return}
 g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(edit.image,lay.x,lay.y,lay.w,lay.h);
 if($('decoLightNightPreview').checked){
  g.fillStyle='rgba(9,22,43,.72)';g.fillRect(0,0,W,H);
  for(const l of edit.lights)paintHouseLight(g,l,lay.x,lay.y,lay.scale,lay.scale,1);
 }
 for(const light of edit.lights){
  const x=lay.x+light.x*lay.scale,y=lay.y+light.y*lay.scale,active=light.id===edit.selected;
  g.save();g.strokeStyle=active?'#54eeff':'#f8d879';g.lineWidth=active?3:1.7;g.setLineDash(active?[]:[5,4]);
  let hx,hy;
  if(light.shape==='rect'){
   const w=light.width*lay.scale,h=light.height*lay.scale;
   g.strokeRect(x-w/2,y-h/2,w,h);hx=x+w/2;hy=y+h/2;
  }else{const r=light.radius*lay.scale;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.stroke();hx=x+r;hy=y;}
  g.setLineDash([]);g.fillStyle=active?'#56f1ff':'#f7d26b';g.beginPath();g.arc(x,y,5.5,0,2*Math.PI);g.fill();
  if(active){g.fillStyle='#fff';g.strokeStyle='#0d6c99';g.fillRect(hx-6,hy-6,12,12);g.strokeRect(hx-6,hy-6,12,12)}
  g.restore();
 }
 g.strokeStyle='#bdcddd';g.lineWidth=1.2;g.strokeRect(lay.x,lay.y,lay.w,lay.h);
 g.fillStyle='#f4d594';g.font='12px system-ui';g.textAlign='left';g.fillText('ĐÈN DECO · Kéo tâm / góc để điều chỉnh',16,26);
 g.restore();
}
function decoLightRefreshFields(){
 const edit=decoLightEditor,list=$('decoLightList');if(!edit)return;
 list.replaceChildren();edit.lights.forEach((l,i)=>list.add(new Option(`${i+1}. ${l.shape==='circle'?'● Tròn':'▭ Chữ nhật'} · ${l.color}`,l.id)));
 const light=decoLightSelected();$('decoLightFields').hidden=!light;
 if(!light){decoLightRender();return}
 list.value=light.id;$('decoLightShape').value=light.shape;
 $('decoLightX').value=Math.round(light.x);$('decoLightY').value=Math.round(light.y);
 $('decoLightWLabel').firstChild.textContent=light.shape==='circle'?'Bán kính (px)':'Rộng (px)';
 $('decoLightHLabel').hidden=light.shape==='circle';
 $('decoLightW').value=Math.round(light.shape==='circle'?light.radius:light.width);
 $('decoLightH').value=Math.round(light.height);$('decoLightColor').value=rgbNight(light.color);
 $('decoLightIntensity').value=Math.round(light.intensity*100);
 $('decoLightIntensityOut').textContent=Math.round(light.intensity*100)+'%';decoLightRender();
}
function openDecoLightEditor(row){
 const assetKey=decoLightKey(row.group,row.id),image=decoImageCache.get(row.path)||new Image();
 decoLightEditor={assetKey,record:row,image,lights:JSON.parse(JSON.stringify(decoLightConfigs[assetKey]||[])),selected:null,drag:null,layout:null};
 decoLightEditor.selected=decoLightEditor.lights[0]?.id||null;
 $('decoLightTitle').textContent=assetKey+' · áp dụng cho mọi bản sao';
 $('decoLightModal').hidden=false;
 const current=decoLightEditor;
 if(!image.naturalWidth){image.onload=()=>{if(decoLightEditor===current)decoLightRender()};image.onerror=()=>notify('Không tải được ảnh Deco để preview');image.src=row.path}
 decoLightRefreshFields();
}
function closeDecoLightEditor(){$('decoLightModal').hidden=true;decoLightEditor=null}
function decoLightAdd(shape){
 const edit=decoLightEditor;if(!edit)return;
 if(edit.lights.length>=100){notify('Giới hạn 100 nguồn sáng trên mỗi asset');return}
 const w=edit.image?.naturalWidth||120,h=edit.image?.naturalHeight||120;
 const light={id:'light_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6),shape,x:Math.round(w/2),y:Math.round(h*.65),width:Math.max(4,Math.round(w*.32)),height:Math.max(4,Math.round(h*.11)),radius:Math.max(5,Math.round(Math.min(w,h)*.23)),color:'#ffd38c',intensity:1};
 edit.lights.push(light);edit.selected=light.id;decoLightRefreshFields();
}
function decoLightReadFields(){
 const light=decoLightSelected(),edit=decoLightEditor;if(!light||!edit)return;
 const w=edit.image?.naturalWidth||10000,h=edit.image?.naturalHeight||10000;
 light.shape=$('decoLightShape').value;
 light.x=Math.max(0,Math.min(w,Number($('decoLightX').value)||0));light.y=Math.max(0,Math.min(h,Number($('decoLightY').value)||0));
 if(light.shape==='circle')light.radius=Math.max(3,Number($('decoLightW').value)||3);
 else{light.width=Math.max(3,Number($('decoLightW').value)||3);light.height=Math.max(3,Number($('decoLightH').value)||3)}
 light.color=rgbNight($('decoLightColor').value);light.intensity=Math.max(0,Math.min(3,Number($('decoLightIntensity').value)/100));
 $('decoLightIntensityOut').textContent=Math.round(light.intensity*100)+'%';decoLightRender();
}
function decoLightExport(){
 // Export includes the current editor draft, even when Apply has not yet been pressed.
 const data=JSON.parse(JSON.stringify(decoLightConfigs));
 if(decoLightEditor){const e=decoLightEditor;data[e.assetKey]=decoLightValidConfig(e.lights,e.image?.naturalWidth||100000,e.image?.naturalHeight||100000)}
 download('deco_lights.json',JSON.stringify({format:'tnvq-deco-night-lights',schemaVersion:1,coordinateSystem:'image-local-top-left-px',maxIntensity:3,assets:data},null,2)+'\n');
 notify('Đã xuất deco_lights.json · chép vào Asset/Sprites để sử dụng trong bản build');
}
function decoLightSave(){
 const edit=decoLightEditor;if(!edit)return;
 const w=edit.image?.naturalWidth||100000,h=edit.image?.naturalHeight||100000;
 decoLightConfigs[edit.assetKey]=decoLightValidConfig(edit.lights,w,h);
 try{localStorage.setItem(DECO_LIGHT_STORE,JSON.stringify({schemaVersion:1,assets:decoLightConfigs}))}catch(err){console.warn('Could not save Deco lights',err)}
 requestDraw();notify('Đã lưu '+edit.lights.length+' đèn cho '+edit.assetKey+' · áp dụng chung');closeDecoLightEditor();
}
function decoLightPointerDown(e){
 const edit=decoLightEditor,lay=edit?.layout;if(!lay)return;
 const p=decoLightCanvasXY(e);
 for(let i=edit.lights.length-1;i>=0;i--){
  const l=edit.lights[i],x=lay.x+l.x*lay.scale,y=lay.y+l.y*lay.scale;
  const hx=l.shape==='circle'?x+l.radius*lay.scale:x+l.width*lay.scale/2;
  const hy=l.shape==='circle'?y:y+l.height*lay.scale/2;
  let type=null;
  if(Math.hypot(p.x-hx,p.y-hy)<=16)type='resize';
  else if(l.shape==='circle'&&Math.hypot(p.x-x,p.y-y)<=Math.max(12,l.radius*lay.scale))type='move';
  else if(l.shape==='rect'&&Math.abs(p.x-x)<=Math.max(11,l.width*lay.scale/2)&&Math.abs(p.y-y)<=Math.max(11,l.height*lay.scale/2))type='move';
  if(!type)continue;
  edit.selected=l.id;edit.drag={type,start:p,initial:{...l}};
  decoLightUI().setPointerCapture(e.pointerId);decoLightRefreshFields();e.preventDefault();return;
 }
}
function decoLightPointerMove(e){
 const edit=decoLightEditor,drag=edit?.drag,lay=edit?.layout;if(!drag||!lay)return;
 const l=decoLightSelected();if(!l)return;e.preventDefault();
 const p=decoLightCanvasXY(e),dx=(p.x-drag.start.x)/lay.scale,dy=(p.y-drag.start.y)/lay.scale;
 const maxX=edit.image?.naturalWidth||10000,maxY=edit.image?.naturalHeight||10000;
 if(drag.type==='move'){
  l.x=Math.round(Math.max(0,Math.min(maxX,drag.initial.x+dx)));
  l.y=Math.round(Math.max(0,Math.min(maxY,drag.initial.y+dy)));
 }else if(l.shape==='circle')l.radius=Math.max(3,Math.round(drag.initial.radius+dx));
 else{l.width=Math.max(3,Math.round(drag.initial.width+dx*2));l.height=Math.max(3,Math.round(drag.initial.height+dy*2))}
 decoLightRefreshFields();
}
function decoLightPointerEnd(){if(decoLightEditor)decoLightEditor.drag=null}
$('decoLightClose').onclick=closeDecoLightEditor;
$('decoLightAddCircle').onclick=()=>decoLightAdd('circle');$('decoLightAddRect').onclick=()=>decoLightAdd('rect');
$('decoLightList').onchange=e=>{if(decoLightEditor){decoLightEditor.selected=e.target.value;decoLightRefreshFields()}};
$('decoLightShape').onchange=()=>{decoLightReadFields();decoLightRefreshFields()};
for(const id of ['decoLightX','decoLightY','decoLightW','decoLightH','decoLightColor','decoLightIntensity'])$(id).oninput=decoLightReadFields;
$('decoLightNightPreview').onchange=decoLightRender;
$('decoLightRemove').onclick=()=>{const edit=decoLightEditor;if(!edit)return;edit.lights=edit.lights.filter(l=>l.id!==edit.selected);edit.selected=edit.lights[0]?.id||null;decoLightRefreshFields()};
$('decoLightSave').onclick=decoLightSave;$('decoLightExport').onclick=decoLightExport;
$('decoLightImport').onchange=async e=>{
 const f=e.target.files?.[0];if(!f)return;
 try{
  const payload=JSON.parse(await f.text());if(!payload?.assets||typeof payload.assets!=='object')throw new Error('Không có assets');
  for(const [name,lights] of Object.entries(payload.assets))if(/^Deco\/[A-Za-z][A-Za-z0-9_-]*\/[^/]+$/.test(name))decoLightConfigs[name]=decoLightValidConfig(lights);
  if(decoLightEditor){decoLightEditor.lights=JSON.parse(JSON.stringify(decoLightConfigs[decoLightEditor.assetKey]||[]));decoLightEditor.selected=decoLightEditor.lights[0]?.id||null;decoLightRefreshFields()}
  localStorage.setItem(DECO_LIGHT_STORE,JSON.stringify({schemaVersion:1,assets:decoLightConfigs}));requestDraw();notify('Đã nhập cấu hình ánh sáng Deco');
 }catch(err){alert('Lỗi nhập Deco Lights: '+err.message)}finally{e.target.value=''}
};
const decoLightCanvas=decoLightUI();decoLightCanvas.onpointerdown=decoLightPointerDown;decoLightCanvas.onpointermove=decoLightPointerMove;
for(const name of ['pointerup','pointercancel','lostpointercapture'])decoLightCanvas.addEventListener(name,decoLightPointerEnd);
$('decoLightModal').addEventListener('pointerdown',e=>{if(e.target===$('decoLightModal'))closeDecoLightEditor()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('decoLightModal').hidden){closeDecoLightEditor();e.stopPropagation()}});
