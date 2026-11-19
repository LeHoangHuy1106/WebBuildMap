'use strict';
// WORLD MAP BUILDER v15: Construction system, centered houses, composite shadows, house randomizer.
// Terrain is kept in map.json (code + landType 0/1/2).
// House-local rectangles live in houses.json; placed buildings in buildings.json.
const CONSTRUCTION_INDUSTRIES=[
'01 · Tạp hóa','02 · Siêu thị mini','03 · Trái cây','04 · Rau củ','05 · Đồ gia dụng','06 · Điện máy','07 · Thời trang','08 · Giày dép','09 · Văn phòng phẩm','10 · Đồ chơi','11 · Mỹ phẩm','12 · Sách','13 · Cửa hàng hoa','14 · Phụ kiện điện thoại','15 · Đồ nội thất','16 · Quán cà phê','17 · Trà sữa','18 · Quán cơm','19 · Quán phở/mì','20 · Tiệm bánh','21 · Quán ăn nhanh','22 · Nhà hàng','23 · Tiệm nước ép','24 · Quán kem','25 · Quầy đồ ăn mang đi','26 · Tiệm tóc','27 · Giặt ủi','28 · Sửa xe','29 · Spa','30 · Phòng gym','31 · Khách sạn dịch vụ','32 · Rạp chiếu mini','33 · Dịch vụ chụp ảnh','34 · Trung tâm học thêm','35 · Dịch vụ vệ sinh'];
let constructionRegistry={houses:[],interiors:[],doors:[]};
const constructionImages=new Map();
const constructionObjects=new Map();
const constructionShadowCache=new Map();
let houseRects=new Map();
const constructionSettings={widthPercent:110,offsetY:30,randomHouseOnBuild:false};
let lightEditorMode='mask',maskEditLights=[],selectedHouseLightId=null,lightPointer=null;
let editCell=null,maskHouseId=null,maskEditRect=null,maskGeometry=null,maskPointer=null;

function constructionImage(path){return constructionImages.get(path)}
function preloadConstructionImages(){
 for(const group of ['houses','interiors','doors'])for(const item of constructionRegistry[group]){
  if(constructionImages.has(item.path))continue;
  const image=new Image();image.onload=()=>{requestDraw();if(!$('buildingModal').hidden)drawBuildingPreview();if(!$('maskModal').hidden)renderMaskCanvas()};
  image.onerror=()=>console.warn('Construction PNG not found',item.id,item.path);
  image.src=item.path;constructionImages.set(item.path,image);
 }
}
function getHouse(id){return constructionRegistry.houses.find(e=>e.id===id)}
function getDoor(id){return constructionRegistry.doors.find(e=>e.id===id)}
function getInterior(level,industry){return constructionRegistry.interiors.find(e=>Number(e.level)===Number(level)&&Number(e.industry)===Number(industry))}
function rectDefaults(item){const im=constructionImage(item.path);const w=im?.naturalWidth||293,h=im?.naturalHeight||283;return{rect:{x:Math.round(w*.15),y:Math.round(h*.57),width:Math.round(w*.7),height:Math.round(h*.39)},imageWidth:w,imageHeight:h,calibrated:false}}
function copyRect(r){return{x:Number(r.x)||0,y:Number(r.y)||0,width:Number(r.width)||0,height:Number(r.height)||0}}
function rectify(r,w,h){const x=Math.min(Math.max(0,r.x),w-2),y=Math.min(Math.max(0,r.y),h-2);return{x,y,width:Math.min(Math.max(2,r.width),w-x),height:Math.min(Math.max(2,r.height),h-y)}}
function rectForHouse(item){if(!item)return null;const im=constructionImage(item.path);const record=houseRects.get(item.id)||rectDefaults(item);if(!im?.naturalWidth)return record.rect;return rectify(copyRect(record.rect),im.naturalWidth,im.naturalHeight)}
function loadConstructionRegistry(manifest){
 constructionShadowCache.clear();
 const incoming=manifest?.constructionAssets||{};
 constructionRegistry={houses:[...(incoming.houses||[])],interiors:[...(incoming.interiors||[])],doors:[...(incoming.doors||[])]};
 const fromSource=manifest?.houseConfigs||{};
 for(const row of constructionRegistry.houses){if(!houseRects.has(row.id)){
  const saved=fromSource[row.id];houseRects.set(row.id,saved?.rect?JSON.parse(JSON.stringify(saved)):rectDefaults(row));
 }}
 preloadConstructionImages();
 if(typeof updateConstructionCounters==='function')updateConstructionCounters();
}
function constructionConfigFile(){return{format:'tnvq-house-masks',schemaVersion:1,coordinateSystem:'image-local-top-left-px',houses:Object.fromEntries(houseRects)}}
function constructionDataFile(){return{format:'tnvq-buildings',schemaVersion:1,tileSize:TS,settings:{...constructionSettings},buildings:[...constructionObjects.values()].map(o=>({...o}))}}
function saveConstructionLocal(){
 try{localStorage.setItem('tnvq_v13_houses',JSON.stringify(constructionConfigFile()));localStorage.setItem('tnvq_v13_buildings',JSON.stringify(constructionDataFile()))}catch(e){console.warn('Cannot persist buildings',e)}
}
function updateConstructionCounters(){
 let sites=0;for(const tile of map.values())if(tile.code==='305'&&tile.landType===1)sites++;
 $('availableLots').textContent=sites;$('builtCount').textContent=constructionObjects.size;
}
function rebuildHouseSelect(select,value,level=null){
 select.replaceChildren();const list=constructionRegistry.houses.filter(h=>level===null||Number(h.level)===Number(level));
 for(const item of list){const o=document.createElement('option');o.value=item.id;o.textContent=item.id+' · Level '+item.level;select.append(o)}
 if(value&&list.some(e=>e.id===value))select.value=value;
}
function updateConstructionSelects(previous={}){
 const level=Number($('buildingLevel').value),houseChoice=previous.houseId||$('buildingHouse').value;
 rebuildHouseSelect($('buildingHouse'),houseChoice,level);
 const sel=$('buildingDoor');sel.replaceChildren();for(const door of constructionRegistry.doors){const o=document.createElement('option');o.value=door.id;o.textContent=door.id;sel.append(o)}
 const selectedDoor=previous.doorId||sel.dataset.preferred||sel.value;
 if(constructionRegistry.doors.some(d=>d.id===selectedDoor))sel.value=selectedDoor;
 const industry=$('buildingIndustry');if(industry.options.length!==CONSTRUCTION_INDUSTRIES.length){industry.replaceChildren();CONSTRUCTION_INDUSTRIES.forEach((name,i)=>{const opt=document.createElement('option');opt.value=i+1;opt.textContent=name;industry.append(opt)})}
 if(previous.industry)industry.value=String(previous.industry);
}
function availableHousesForLevel(level){return constructionRegistry.houses.filter(h=>Number(h.level)===Number(level))}
function chooseRandomHouse(level,currentId='',avoidSame=true){
 const choices=availableHousesForLevel(level);if(!choices.length)return null;
 const alternatives=avoidSame&&choices.length>1?choices.filter(h=>h.id!==currentId):choices;
 return alternatives[Math.floor(Math.random()*alternatives.length)]||choices[0];
}
function randomizeSelectedHouse(){
 const level=Number($('buildingLevel').value),old=$('buildingHouse').value,chosen=chooseRandomHouse(level,old);
 if(!chosen){notify('Level '+level+' chưa có House để random');return}
 $('buildingHouse').value=chosen.id;drawBuildingPreview();notify('Đã chọn mẫu nhà '+chosen.id+' (Level '+level+')');
}
function randomizeAllHouses(){
 if(!constructionObjects.size){notify('Chưa có công trình để random');return}
 const count=[...constructionObjects.values()].filter(b=>availableHousesForLevel(b.level).length>1).length;
 if(!count){notify('Không có Level nào có từ 2 House để đổi mẫu');return}
 if(!confirm('Random lại mẫu House của '+count+' công trình? Level, ngành, Door và tọa độ sẽ giữ nguyên.'))return;
 let changed=0;for(const b of constructionObjects.values()){
  const chosen=chooseRandomHouse(b.level,b.houseId);if(chosen&&chosen.id!==b.houseId){b.houseId=chosen.id;changed++}
 }
 saveSoon();requestDraw();notify('Đã random '+changed+' House; giữ nguyên Level / Interior / Door');
}
function fillBuildingForm(existing){
 const level=existing?.level??4;$('buildingLevel').value=String(level);
 updateConstructionSelects(existing||{});
 if(!existing&&constructionRegistry.doors.length)$('buildingDoor').value=constructionRegistry.doors[Math.floor(Math.random()*constructionRegistry.doors.length)].id;
 if(!existing&&constructionSettings.randomHouseOnBuild){const chosen=chooseRandomHouse(level);if(chosen)$('buildingHouse').value=chosen.id;}
 $('doorPreviewClosed').checked=false;$('removeBuilding').hidden=!existing;
 drawBuildingPreview();
}
function tryOpenConstructionAt(point,cell){
 // House sprites extend well above their anchor tile. Hit test them first from front to back.
 const items=constructionSceneItems().reverse();
 for(const o of items){const box=o.bounds();if(point.x>=box.x&&point.x<=box.x+box.w&&point.y>=box.y&&point.y<=box.y+box.h){
  editCell={x:o.building.x,y:o.building.y};openBuildingEditor(editCell);return true;
 }}
 const k=key(cell.x,cell.y),tile=map.get(k);
 if(constructionObjects.has(k)||tile?.code==='305'&&tile.landType===1){editCell={...cell};openBuildingEditor(cell);return true}
 return false;
}
function openBuildingEditor(c){
 if(simMode)return;
 const t=map.get(key(c.x,c.y)),existing=constructionObjects.get(key(c.x,c.y));
 if(!existing&&!(t?.code==='305'&&t.landType===1))return;
 editCell={x:c.x,y:c.y};$('buildingModalLocation').textContent=`Ô (${c.x}, ${c.y}) · ${existing?'Đang có nhà':'Đất xây dựng (loại 1)'}`;
 fillBuildingForm(existing);$('buildingModal').hidden=false;drawBuildingPreview();
}
function closeBuildingEditor(){editCell=null;$('buildingModal').hidden=true}
function buildingSelections(){return{houseId:$('buildingHouse').value,level:Number($('buildingLevel').value),doorId:$('buildingDoor').value,industry:Number($('buildingIndustry').value)}}
function buildingForUI(){const a=buildingSelections();return {...a,x:editCell?.x||0,y:editCell?.y||0}}
function shopIsOpen(){return !simMode||(dayNight.minute>=7*60&&dayNight.minute<20*60)}
function drawCover(ctx,image,x,y,w,h){if(!image?.naturalWidth)return;
 const iw=image.naturalWidth,ih=image.naturalHeight,srcRatio=iw/ih,dstRatio=w/h;let sx=0,sy=0,sw=iw,sh=ih;
 if(srcRatio>dstRatio){sw=ih*dstRatio;sx=(iw-sw)/2}else{sh=iw/dstRatio;sy=(ih-sh)/2}
 ctx.drawImage(image,sx,sy,sw,sh,x,y,w,h);
}
function drawConstructionComposite(c,building,left,top,drawW,drawH,forceClose){
 const house=getHouse(building.houseId);if(!house)return;
 const img=constructionImage(house.path);if(!img?.naturalWidth)return;
 const sx=drawW/img.naturalWidth,sy=drawH/img.naturalHeight,mask=rectForHouse(house);
 if(mask){const rx=left+mask.x*sx,ry=top+mask.y*sy,rw=mask.width*sx,rh=mask.height*sy;
  c.save();c.beginPath();c.rect(rx,ry,rw,rh);c.clip();
  const interior=getInterior(building.level,building.industry),inside=interior&&constructionImage(interior.path);
  if(inside?.naturalWidth)drawCover(c,inside,rx,ry,rw,rh);
  else{c.fillStyle='#253244';c.fillRect(rx,ry,rw,rh)}
  if(forceClose){const door=getDoor(building.doorId),dimg=door&&constructionImage(door.path);if(dimg?.naturalWidth)drawCover(c,dimg,rx,ry,rw,rh)}
  c.restore();
 }
 c.drawImage(img,left,top,drawW,drawH);
}
function constructionShadowSprite(building){
 // Compose the visible full building into one cached alpha silhouette, so the
 // interior fills the transparent aperture without a separately doubled shadow.
 const house=getHouse(building.houseId),image=house&&constructionImage(house.path);
 if(!image?.naturalWidth)return null;
 const interior=getInterior(building.level,building.industry);
 const interiorImage=interior&&constructionImage(interior.path);
 if(!interiorImage?.naturalWidth)return image; // do not cache while assets are loading
 const r=rectForHouse(house);
 const cacheKey=[building.houseId,building.level,building.industry,r?.x,r?.y,r?.width,r?.height].join('|');
 if(constructionShadowCache.has(cacheKey))return constructionShadowCache.get(cacheKey);
 const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;
 const p=c.getContext('2d');drawConstructionComposite(p,building,0,0,c.width,c.height,false);
 constructionShadowCache.set(cacheKey,c);
 return c;
}
function constructionPlacement(building){
 const house=getHouse(building.houseId),img=house&&constructionImage(house.path);
 if(!img?.naturalWidth)return null;
 const width=TS*constructionSettings.widthPercent/100,height=width*(img.naturalHeight/img.naturalWidth);
 // House is anchored to the horizontal CENTER of its construction tile.
 // Width expands equally to both sides; height keeps the source aspect ratio.
 const centerX=(building.x+.5)*TS,baseY=(building.y+1)*TS-constructionSettings.offsetY;
 const left=centerX-width/2;
 return{house,img,worldX:centerX,worldY:baseY,width,height,left,top:baseY-height};
}

// Night-time House lights: coordinates in original House image pixels.
function rgbNight(hex){const raw=String(hex||'#ffcc88');return /^#[0-9a-f]{6}$/i.test(raw)?raw:'#ffd38c'}
function normalizeHouseLights(list,w,h){if(!Array.isArray(list))return [];return list.filter(e=>e&&['circle','rect'].includes(e.shape)).map((e,i)=>({
 id:String(e.id||'light_'+i),shape:e.shape,x:Math.max(0,Math.min(w,Number(e.x)||0)),y:Math.max(0,Math.min(h,Number(e.y)||0)),
 width:Math.max(3,Math.min(w*2,Number(e.width)||42)),height:Math.max(3,Math.min(h*2,Number(e.height)||24)),
 radius:Math.max(3,Math.min(Math.max(w,h),Number(e.radius)||35)),color:rgbNight(e.color),intensity:Math.max(0,Math.min(1,Number(e.intensity)||0))}));}
function getHouseLights(item){return item?(houseRects.get(item.id)?.lights||[]):[]}
// Fast 2D gradients, no Canvas blur or per-frame allocated textures; many lamps are permitted.
function paintHouseLight(g,light,x,y,sx,sy,dark){const intensity=Math.min(1,Math.max(0,(Number(light.intensity)||0)*dark));if(intensity<=.005)return;
 const px=x+light.x*sx,py=y+light.y*sy,col=rgbNight(light.color),rad=Math.max(1,light.radius*sx);
 g.save();g.globalCompositeOperation='screen';
 if(light.shape==='circle'){
  const halo=g.createRadialGradient(px,py,0,px,py,rad*1.35);
  halo.addColorStop(0,col);halo.addColorStop(.17,col);halo.addColorStop(1,'#000000');
  // transparent fade with a non-opaque custom gradient, avoiding hard-edged circles
  const c=hexToRgb(col),f=g.createRadialGradient(px,py,0,px,py,rad*1.4);
  f.addColorStop(0,`rgba(${c.r},${c.g},${c.b},${(intensity*.74).toFixed(3)})`);
  f.addColorStop(.35,`rgba(${c.r},${c.g},${c.b},${(intensity*.38).toFixed(3)})`);
  f.addColorStop(1,`rgba(${c.r},${c.g},${c.b},0)`);
  g.fillStyle=f;g.beginPath();g.arc(px,py,rad*1.4,0,Math.PI*2);g.fill();
 }else{
  const ww=Math.max(2,light.width*sx),hh=Math.max(2,light.height*sy),c=hexToRgb(col);
  const rx=Math.max(ww*.73,4),ry=Math.max(hh*.9,5);
  g.save();g.translate(px,py);g.scale(rx,ry);
  const halo=g.createRadialGradient(0,0,0,0,0,1.9);
  halo.addColorStop(0,`rgba(${c.r},${c.g},${c.b},${(intensity*.40).toFixed(3)})`);
  halo.addColorStop(.48,`rgba(${c.r},${c.g},${c.b},${(intensity*.24).toFixed(3)})`);
  halo.addColorStop(1,`rgba(${c.r},${c.g},${c.b},0)`);
  g.fillStyle=halo;g.fillRect(-1.9,-1.9,3.8,3.8);g.restore();
  g.fillStyle=`rgba(${c.r},${c.g},${c.b},${(intensity*.37).toFixed(3)})`;
  g.fillRect(px-ww/2,py-hh/2,ww,hh);
 }
 g.restore();}
function hexToRgb(s){const n=parseInt(rgbNight(s).slice(1),16);return{r:n>>16,g:(n>>8)&255,b:n&255}}
function drawConstructionNightLights(){
 const dark=1-daylightFactor();if(!simMode||dark<=.02)return;
 for(const b of constructionObjects.values()){
  const house=getHouse(b.houseId),lights=getHouseLights(house);if(!house||!lights.length)continue;
  const pos=constructionPlacement(b);if(!pos)continue;
  const p=toScreen(pos.left,pos.top),w=pos.width*zoom,h=pos.height*zoom;
  if(p.x>vw+140||p.x+w<-140||p.y>vh+140||p.y+h<-140)continue;
  const sx=w/pos.img.naturalWidth,sy=h/pos.img.naturalHeight;
  for(const light of lights)paintHouseLight(ctx,light,p.x,p.y,sx,sy,dark);
 }
}

function constructionSceneItems(){
 const list=[];for(const building of constructionObjects.values()){
  const pos=constructionPlacement(building);if(!pos)continue;
  const s=toScreen(pos.left,pos.top),dw=pos.width*zoom,dh=pos.height*zoom;
  if(s.x>vw+100||s.x+dw<-100||s.y>vh+100||s.y+dh<-100)continue;
  list.push({worldY:pos.worldY,building,
   bounds(){return{x:s.x,y:s.y,w:dw,h:dh}},
   draw(c){drawConstructionComposite(c,building,s.x,s.y,dw,dh,!shopIsOpen())},
   drawShadow(){const shadowSprite=constructionShadowSprite(building)||pos.img;
    castFullSpriteShadow(shadowSprite,pos.worldX,pos.worldY,dw,dh,.5,1,false,.83)}
  });
 }return list;
}
function drawConstructionObjectsOnly(){const list=constructionSceneItems().sort((a,b)=>a.worldY-b.worldY);for(const item of list)item.draw(ctx)}
function drawBuildingPreview(){
 const el=$('buildingPreview');if(!el)return;const c=el.getContext('2d'),ww=el.width,hh=el.height;
 c.clearRect(0,0,ww,hh);c.fillStyle='#eadbd0';c.fillRect(0,0,ww,hh);
 for(let x=0;x<ww;x+=24){c.strokeStyle='#e3d1c1';c.beginPath();c.moveTo(x,0);c.lineTo(x,hh);c.stroke()}
 const b=buildingForUI(),house=getHouse(b.houseId),img=house&&constructionImage(house.path);
 const available=!!getInterior(b.level,b.industry),valid=!!img?.naturalWidth&&available;
 const hint=$('buildingAssetHint');if(!house)hint.textContent='Chưa có House Level '+b.level+' trong Asset.';
 else if(!available)hint.textContent='⚠ Ngành '+String(b.industry).padStart(2,'0')+' Level '+b.level+' chưa có Interior PNG, không thể lưu nhà này.';
 else hint.textContent='✓ Có House, Interior, Door. '+(houseRects.get(house.id)?.calibrated?'Mask đã căn thủ công.':'Mask đang ở vị trí gợi ý, nên chỉnh trước khi dùng.');
 $('saveBuilding').disabled=!valid;
 if(!img?.naturalWidth)return;
 const dw=Math.min(ww-36,(hh-32)*img.naturalWidth/img.naturalHeight),dh=dw*img.naturalHeight/img.naturalWidth;
 drawConstructionComposite(c,b,(ww-dw)/2,(hh-dh)/2,dw,dh,$('doorPreviewClosed').checked);
}
function saveBuildingFromForm(){
 if(!editCell)return;
 const value=buildingForUI(),k=key(editCell.x,editCell.y),existing=constructionObjects.get(k),tile=map.get(k);
 if(!getHouse(value.houseId)||!getInterior(value.level,value.industry)){notify('Thiếu House hoặc Interior cho Level/Ngành đang chọn');return}
 if(!existing&&!(tile?.code==='305'&&tile.landType===1)){notify('Chỉ xây được trên đất xây dựng (loại 1)');return}
 constructionObjects.set(k,value);
 if(tile?.code==='305'&&tile.landType!==0){map.set(k,{...tile,landType:0});validationDirty=true}
 closeBuildingEditor();updateStats();updateConstructionCounters();saveSoon();requestDraw();notify('Đã '+(existing?'cập nhật':'xây')+' công trình · nền chuyển về vỉa hè thường');
}
function deleteBuildingFromForm(){
 if(!editCell)return;
 const k=key(editCell.x,editCell.y);if(!constructionObjects.has(k))return;
 constructionObjects.delete(k);const tile=map.get(k);if(tile?.code==='305')map.set(k,{...tile,landType:1});
 closeBuildingEditor();updateStats();updateConstructionCounters();saveSoon();requestDraw();notify('Đã gỡ nhà, khôi phục ô đất xây dựng');
}
function updateMaskHouseSelect(value){rebuildHouseSelect($('maskHouse'),value,null);maskHouseId=$('maskHouse').value;
 const item=getHouse(maskHouseId),record=houseRects.get(maskHouseId)||(item?rectDefaults(item):null);
 maskEditRect=record?copyRect(record.rect):null;maskEditLights=structuredClone(Array.isArray(record?.lights)?record.lights:[]);selectedHouseLightId=maskEditLights[0]?.id??null;refreshMaskFields();refreshLightFields();renderMaskCanvas();
}
function openMaskEditor(id){if(!constructionRegistry.houses.length){notify('Chưa có House PNG');return}
 $('maskModal').hidden=false;switchHouseEditorMode('mask');updateMaskHouseSelect(id||constructionRegistry.houses[0].id);
}
function closeMaskEditor(){$('maskModal').hidden=true;maskPointer=null;requestDraw();if(!$('buildingModal').hidden)drawBuildingPreview()}
function refreshMaskFields(){if(!maskEditRect)return;
 for(const [field,prop] of [['maskX','x'],['maskY','y'],['maskW','width'],['maskH','height']])$(field).value=Math.round(maskEditRect[prop]);
 const item=getHouse(maskHouseId),im=item&&constructionImage(item.path);
 $('maskImageInfo').textContent=im?.naturalWidth?`PNG gốc ${im.naturalWidth}×${im.naturalHeight}px · local X/Y từ góc trên trái`:'Đang nạp House PNG';
}
function maskLayout(){const item=getHouse(maskHouseId),img=item&&constructionImage(item.path),can=$('maskCanvas');
 if(!img?.naturalWidth)return null;
 const scale=Math.min((can.width-50)/img.naturalWidth,(can.height-50)/img.naturalHeight),w=img.naturalWidth*scale,h=img.naturalHeight*scale;
 return{img,scale,x:(can.width-w)/2,y:(can.height-h)/2,w,h};
}
function renderMaskCanvas(){const cv=$('maskCanvas'),c=cv.getContext('2d'),layout=maskLayout();c.clearRect(0,0,cv.width,cv.height);
 c.fillStyle='#eadcc9';c.fillRect(0,0,cv.width,cv.height);
 for(let x=0;x<cv.width;x+=20){c.strokeStyle='#d8c4ab';c.beginPath();c.moveTo(x,0);c.lineTo(x,cv.height);c.stroke()}
 if(!layout||!maskEditRect){maskGeometry=null;return}
 c.drawImage(layout.img,layout.x,layout.y,layout.w,layout.h);
 if(lightEditorMode==='light'){renderHouseNightEditor(c,layout);return}
 const r=maskEditRect,x=layout.x+r.x*layout.scale,y=layout.y+r.y*layout.scale,w=r.width*layout.scale,h=r.height*layout.scale;
 c.fillStyle='rgba(25,160,205,.19)';c.fillRect(x,y,w,h);c.strokeStyle='#06b2de';c.lineWidth=3;c.setLineDash([8,5]);c.strokeRect(x,y,w,h);c.setLineDash([]);
 maskGeometry={x,y,w,h,layout};
 for(const [xx,yy] of [[x,y],[x+w,y],[x+w,y+h],[x,y+h]]){c.fillStyle='#fff';c.strokeStyle='#078bac';c.lineWidth=3;c.fillRect(xx-6,yy-6,12,12);c.strokeRect(xx-6,yy-6,12,12)}
 c.fillStyle='#046d84';c.font='bold 15px Segoe UI';c.fillText('INTERIOR RECT',x+7,y+21);
}
function maskPointerAt(e){const r=$('maskCanvas').getBoundingClientRect();return{x:(e.clientX-r.left)*$('maskCanvas').width/r.width,y:(e.clientY-r.top)*$('maskCanvas').height/r.height}}
function maskGestureStart(e){if(lightEditorMode==='light')return lightGestureStart(e);if(!maskGeometry)return;const p=maskPointerAt(e),g=maskGeometry;
 const spots=[[g.x,g.y,'nw'],[g.x+g.w,g.y,'ne'],[g.x+g.w,g.y+g.h,'se'],[g.x,g.y+g.h,'sw']];
 let type=null;for(const [x,y,t] of spots)if(Math.hypot(p.x-x,p.y-y)<18){type=t;break}
 if(!type&&p.x>=g.x&&p.x<=g.x+g.w&&p.y>=g.y&&p.y<=g.y+g.h)type='move';
 if(!type)return;e.preventDefault();$('maskCanvas').setPointerCapture(e.pointerId);maskPointer={type,start:p,initial:{...maskEditRect}};
}
function maskGestureMove(e){if(lightEditorMode==='light')return lightGestureMove(e);if(!maskPointer||!maskGeometry)return;e.preventDefault();const p=maskPointerAt(e),g=maskGeometry,dx=(p.x-maskPointer.start.x)/g.layout.scale,dy=(p.y-maskPointer.start.y)/g.layout.scale;
 const a=maskPointer.initial;let x=a.x,y=a.y,w=a.width,h=a.height;
 if(maskPointer.type==='move'){x+=dx;y+=dy}else{
  if(maskPointer.type.includes('w')){x+=dx;w-=dx}else{w+=dx}
  if(maskPointer.type.includes('n')){y+=dy;h-=dy}else{h+=dy}
 }
 maskEditRect=rectify({x,y,width:w,height:h},g.layout.img.naturalWidth,g.layout.img.naturalHeight);
 refreshMaskFields();renderMaskCanvas();
}
function maskGestureEnd(){maskPointer=null;lightPointer=null}
function saveMaskFromForm(){if(!maskHouseId||!maskEditRect)return;
 const img=constructionImage(getHouse(maskHouseId).path);if(!img?.naturalWidth)return;
 const rec={rect:rectify(maskEditRect,img.naturalWidth,img.naturalHeight),imageWidth:img.naturalWidth,imageHeight:img.naturalHeight,calibrated:true,lights:normalizeHouseLights(maskEditLights,img.naturalWidth,img.naturalHeight)};
 houseRects.set(maskHouseId,rec);constructionShadowCache.clear();maskEditRect=copyRect(rec.rect);
 saveConstructionLocal();refreshMaskFields();refreshLightFields();renderMaskCanvas();if(!$('buildingModal').hidden)drawBuildingPreview();requestDraw();notify('Đã lưu Interior Rect & '+rec.lights.length+' nguồn sáng cho '+maskHouseId);
}

function switchHouseEditorMode(mode){lightEditorMode=mode==='light'?'light':'mask';
 $('houseRectTab').classList.toggle('active',lightEditorMode==='mask');$('houseLightTab').classList.toggle('active',lightEditorMode==='light');
 $('maskFieldsSection').hidden=lightEditorMode!=='mask';$('lightFieldsSection').hidden=lightEditorMode!=='light';renderMaskCanvas();}
function selectedHouseLight(){return maskEditLights.find(l=>l.id===selectedHouseLightId)||null}
function refreshLightFields(){const list=$('houseLightList');list.replaceChildren();maskEditLights.forEach((l,i)=>{
 const op=document.createElement('option');op.value=l.id;op.textContent=`${i+1}. ${l.shape==='circle'?'● Tròn':'▭ Chữ nhật'} · ${rgbNight(l.color)}`;list.append(op)});
 const light=selectedHouseLight();$('lightSelectedFields').hidden=!light;
 if(!light){$('houseLightIntensityOut').textContent='0%';return}list.value=light.id;
 for(const [id,key]of [['houseLightX','x'],['houseLightY','y']])$(id).value=Math.round(light[key]);
 $('houseLightShape').value=light.shape;
 $('houseLightWLabel').firstChild.textContent=light.shape==='circle'?'Bán kính':'Rộng';
 $('houseLightHLabel').hidden=light.shape==='circle';
 $('houseLightW').value=Math.round(light.shape==='circle'?light.radius:light.width);
 $('houseLightH').value=Math.round(light.height);$('houseLightColor').value=rgbNight(light.color);
 $('houseLightIntensity').value=Math.round(light.intensity*100);$('houseLightIntensityOut').textContent=Math.round(light.intensity*100)+'%';}
function addHouseLight(shape){const house=getHouse(maskHouseId);if(!house)return;const img=constructionImage(house.path),w=img?.naturalWidth||293,h=img?.naturalHeight||283;
 const center=maskEditRect||rectDefaults(house).rect,id='light_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);
 const light={id,shape,x:Math.round(center.x+center.width/2),y:Math.round(center.y+center.height*.34),width:Math.round(Math.min(65,w*.35)),height:Math.round(Math.min(22,h*.18)),radius:Math.round(Math.min(34,w*.16)),color:'#ffd38c',intensity:.65};
 maskEditLights.push(light);selectedHouseLightId=id;refreshLightFields();renderMaskCanvas();}
function updateSelectedHouseLight(){const light=selectedHouseLight();if(!light)return;
 light.shape=$('houseLightShape').value;light.x=Number($('houseLightX').value)||0;light.y=Number($('houseLightY').value)||0;
 if(light.shape==='circle')light.radius=Math.max(3,Number($('houseLightW').value)||3);
 else{light.width=Math.max(3,Number($('houseLightW').value)||3);light.height=Math.max(3,Number($('houseLightH').value)||3)}
 light.color=$('houseLightColor').value;light.intensity=Number($('houseLightIntensity').value)/100;
 refreshLightFields();renderMaskCanvas();}
function renderHouseNightEditor(g,layout){const cv=$('maskCanvas'),night=$('lightNightPreview').checked;
 if(night){g.fillStyle='rgba(9,22,43,.73)';g.fillRect(0,0,cv.width,cv.height)}
 for(const light of maskEditLights){if(night)paintHouseLight(g,light,layout.x,layout.y,layout.scale,layout.scale,1);
  const px=layout.x+light.x*layout.scale,py=layout.y+light.y*layout.scale,active=light.id===selectedHouseLightId;
  g.save();g.lineWidth=active?3:2;g.strokeStyle=active?'#4ae0fc':'rgba(255,244,170,.75)';g.setLineDash(active?[]:[5,5]);
  if(light.shape==='circle'){const rad=Math.max(3,light.radius*layout.scale);g.beginPath();g.arc(px,py,rad,0,2*Math.PI);g.stroke();if(active){g.setLineDash([]);g.fillStyle='#fff';g.fillRect(px+rad-5,py-5,10,10)}}
  else{const w=light.width*layout.scale,h=light.height*layout.scale;g.strokeRect(px-w/2,py-h/2,w,h);if(active){g.setLineDash([]);g.fillStyle='#fff';g.fillRect(px+w/2-5,py+h/2-5,10,10)}}
  g.setLineDash([]);g.fillStyle=active?'#64f1ff':'#ffee99';g.beginPath();g.arc(px,py,5,0,Math.PI*2);g.fill();g.restore();}
 maskGeometry={layout};
 g.fillStyle=night?'rgba(255,255,255,.85)':'#38536b';g.font='bold 12px Segoe UI';g.fillText('Kéo tâm sáng · Kéo nút góc để thay đổi kích thước',15,cv.height-14);}
function lightGestureStart(e){const g=maskGeometry;if(!g?.layout)return;const p=maskPointerAt(e),lay=g.layout;
 for(let i=maskEditLights.length-1;i>=0;i--){const l=maskEditLights[i],x=lay.x+l.x*lay.scale,y=lay.y+l.y*lay.scale;
  const handleX=l.shape==='circle'?x+l.radius*lay.scale:x+l.width*lay.scale/2;
  const handleY=l.shape==='circle'?y:y+l.height*lay.scale/2;
  let type=null;if(Math.hypot(p.x-handleX,p.y-handleY)<16)type='resize';
  else if(l.shape==='circle'&&Math.hypot(p.x-x,p.y-y)<Math.max(12,l.radius*lay.scale))type='move';
  else if(l.shape==='rect'&&Math.abs(p.x-x)<Math.max(10,l.width*lay.scale/2)&&Math.abs(p.y-y)<Math.max(10,l.height*lay.scale/2))type='move';
  if(!type)continue;selectedHouseLightId=l.id;lightPointer={type,start:p,initial:{...l}};
  $('maskCanvas').setPointerCapture(e.pointerId);e.preventDefault();refreshLightFields();renderMaskCanvas();return;}
}
function lightGestureMove(e){if(!lightPointer||!maskGeometry?.layout)return;e.preventDefault();const p=maskPointerAt(e),l=selectedHouseLight();if(!l)return;
 const lay=maskGeometry.layout,dx=(p.x-lightPointer.start.x)/lay.scale,dy=(p.y-lightPointer.start.y)/lay.scale,a=lightPointer.initial;
 if(lightPointer.type==='move'){l.x=Math.max(0,Math.min(lay.img.naturalWidth,a.x+dx));l.y=Math.max(0,Math.min(lay.img.naturalHeight,a.y+dy))}
 else if(l.shape==='circle')l.radius=Math.max(3,a.radius+dx);
 else{l.width=Math.max(3,a.width+2*dx);l.height=Math.max(3,a.height+2*dy)}
 refreshLightFields();renderMaskCanvas();}

function renderConstructionAssetsBrowser(target){
 const houses=constructionRegistry.houses.filter(e=>e.level===assetLevel),interiors=constructionRegistry.interiors.filter(e=>e.level===assetLevel),doors=constructionRegistry.doors.filter(e=>e.level===assetLevel);
 $('assetCount').textContent=`House ${houses.length} · Interior ${interiors.length} · Door ${doors.length} · Level ${assetLevel}`;
 if(!houses.length&&!interiors.length&&!doors.length){const p=document.createElement('div');p.className='asset-placeholder';p.textContent='Chưa có House/Interior/Door cho Level '+assetLevel;target.append(p);return}
 for(const [group,entries] of [['HOUSES',houses],['INTERIORS',interiors],['DOORS',doors]]){
  const heading=document.createElement('div');heading.className='construction-card-title';heading.textContent=group;target.append(heading);
  for(const item of entries){const card=document.createElement('button');card.type='button';card.className='asset-generic-card construction-asset-card';
   const img=document.createElement('img');img.src=item.path;img.alt=item.id;img.loading='lazy';card.append(img);
   const name=document.createElement('strong');name.textContent=group==='INTERIORS'?`Ngành ${String(item.industry).padStart(2,'0')} · L${item.level}`:item.id;card.append(name);
   if(group==='HOUSES'){const small=document.createElement('span');small.className='asset-badge';small.textContent=houseRects.get(item.id)?.calibrated?'✓ Đã setup Mask':'▣ Chỉnh Interior Rect';card.append(small);card.onclick=()=>openMaskEditor(item.id)}
   else card.onclick=()=>notify(item.id+' · sẽ được ghép vào House trong panel xây dựng');target.append(card)
  }
 }
}
async function readJSONUpload(e,mode){const file=e.target.files?.[0];if(!file)return;
 try{const data=JSON.parse(await file.text());
  if(mode==='houses'){
   const rows=data.houses||{};let count=0;for(const [id,r]of Object.entries(rows)){
    if(!getHouse(id)||!r?.rect)continue;const x=Number(r.rect.x),y=Number(r.rect.y),w=Number(r.rect.width),h=Number(r.rect.height);
    if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)continue;
    houseRects.set(id,{...r,rect:{x,y,width:w,height:h},calibrated:true,lights:normalizeHouseLights(r.lights||[],r.imageWidth||10000,r.imageHeight||10000)});count++;
   }constructionShadowCache.clear();notify('Đã nạp '+count+' House Rect');
  }else{
   if(!Array.isArray(data.buildings))throw Error('File không có buildings[]');
   constructionObjects.clear();let restored=0;for(const row of data.buildings){
    if(!Number.isInteger(row.x)||!Number.isInteger(row.y)||!getHouse(row.houseId))continue;
    const tile=map.get(key(row.x,row.y));if(tile?.code!=='305')continue;
    constructionObjects.set(key(row.x,row.y),{x:row.x,y:row.y,level:Number(row.level)||4,houseId:row.houseId,industry:Number(row.industry)||1,doorId:row.doorId||constructionRegistry.doors[0]?.id||''});
    tile.landType=0;restored++;
   }
   if(data.settings){constructionSettings.widthPercent=Math.min(160,Math.max(80,Number(data.settings.widthPercent)||110));constructionSettings.offsetY=Math.min(90,Math.max(0,Number(data.settings.offsetY)||30));constructionSettings.randomHouseOnBuild=data.settings.randomHouseOnBuild===true;}
   notify('Đã nạp '+restored+' công trình (ô nền thành vỉa hè thường)');
  }
  saveSoon();renderConstructionAssetsBrowser($('assetCards'));updateConstructionCounters();refreshConstructionSettingsUI();requestDraw();
 }catch(error){alert('Không thể nhập file '+mode+': '+error.message)}finally{e.target.value=''}
}
function refreshConstructionSettingsUI(){
 $('houseWidthPct').value=constructionSettings.widthPercent;$('houseWidthPctNum').textContent=constructionSettings.widthPercent+'%';
 $('houseYOffset').value=constructionSettings.offsetY;$('houseYOffsetNum').textContent=constructionSettings.offsetY+' px';
 $('randomHouseOnBuild').checked=constructionSettings.randomHouseOnBuild;
}
function initConstructionSystem(){
 loadConstructionRegistry(ASSET_MANIFEST);
 try{const saved=JSON.parse(localStorage.getItem('tnvq_v13_houses')||'null');if(saved?.houses){for(const [id,r] of Object.entries(saved.houses))if(getHouse(id)&&r?.rect)houseRects.set(id,r)}}catch(error){console.warn('Houses storage invalid',error)}
 try{const saved=JSON.parse(localStorage.getItem('tnvq_v13_buildings')||'null');if(saved?.buildings){
  for(const b of saved.buildings){if(!Number.isInteger(b.x)||!Number.isInteger(b.y)||!getHouse(b.houseId))continue;
   if(map.get(key(b.x,b.y))?.code==='305'){constructionObjects.set(key(b.x,b.y),b);map.get(key(b.x,b.y)).landType=0}
  }
  if(saved.settings)Object.assign(constructionSettings,saved.settings);
 }}catch(error){console.warn('Buildings storage invalid',error)}
 refreshConstructionSettingsUI();updateConstructionCounters();
 $('openMaskManager').onclick=()=>openMaskEditor();$('closeMaskModal').onclick=closeMaskEditor;$('closeBuildingModal').onclick=closeBuildingEditor;
 $('saveBuilding').onclick=saveBuildingFromForm;$('removeBuilding').onclick=deleteBuildingFromForm;
 $('buildingLevel').onchange=()=>{updateConstructionSelects();drawBuildingPreview()};
 $('randomBuildingHouse').onclick=randomizeSelectedHouse;
 $('randomizeAllHouses').onclick=randomizeAllHouses;
 $('randomHouseOnBuild').onchange=()=>{constructionSettings.randomHouseOnBuild=$('randomHouseOnBuild').checked;saveSoon()};
 for(const id of ['buildingHouse','buildingIndustry','buildingDoor','doorPreviewClosed'])$(id).addEventListener('change',drawBuildingPreview);
 $('editBuildingHouseMask').onclick=()=>openMaskEditor($('buildingHouse').value);
 $('maskHouse').onchange=e=>updateMaskHouseSelect(e.target.value);
 $('houseRectTab').onclick=()=>switchHouseEditorMode('mask');$('houseLightTab').onclick=()=>switchHouseEditorMode('light');
 $('lightNightPreview').onchange=renderMaskCanvas;
 $('addCircleLight').onclick=()=>addHouseLight('circle');$('addRectLight').onclick=()=>addHouseLight('rect');
 $('houseLightList').onchange=e=>{selectedHouseLightId=e.target.value;refreshLightFields();renderMaskCanvas()};
 for(const id of ['houseLightShape','houseLightX','houseLightY','houseLightW','houseLightH','houseLightColor','houseLightIntensity'])$(id).addEventListener('input',updateSelectedHouseLight);
 $('removeHouseLight').onclick=()=>{maskEditLights=maskEditLights.filter(x=>x.id!==selectedHouseLightId);selectedHouseLightId=maskEditLights[0]?.id||null;refreshLightFields();renderMaskCanvas()};
 $('saveHouseLights').onclick=saveMaskFromForm;

 $('saveMask').onclick=saveMaskFromForm;
 $('resetMask').onclick=()=>{const h=getHouse(maskHouseId);if(!h)return;maskEditRect=copyRect(rectDefaults(h).rect);refreshMaskFields();renderMaskCanvas()};
 for(const [id,field] of [['maskX','x'],['maskY','y'],['maskW','width'],['maskH','height']])$(id).oninput=e=>{
  if(!maskEditRect)return;maskEditRect[field]=Number(e.target.value)||0;const im=constructionImage(getHouse(maskHouseId).path);if(im?.naturalWidth)maskEditRect=rectify(maskEditRect,im.naturalWidth,im.naturalHeight);renderMaskCanvas();
 };
 const mc=$('maskCanvas');mc.addEventListener('pointerdown',maskGestureStart);mc.addEventListener('pointermove',maskGestureMove);mc.addEventListener('pointerup',maskGestureEnd);mc.addEventListener('pointercancel',maskGestureEnd);
 for(const id of ['houseWidthPct','houseYOffset'])$(id).oninput=()=>{constructionSettings.widthPercent=Number($('houseWidthPct').value);constructionSettings.offsetY=Number($('houseYOffset').value);refreshConstructionSettingsUI();saveSoon();requestDraw()};
 $('exportHouses').onclick=()=>download('houses.json',JSON.stringify(constructionConfigFile(),null,2));
 $('exportBuildings').onclick=()=>download('buildings.json',JSON.stringify(constructionDataFile(),null,2));
 $('importHouses').onchange=e=>readJSONUpload(e,'houses');$('importBuildings').onchange=e=>readJSONUpload(e,'buildings');
 for(const id of ['buildingModal','maskModal'])$(id).addEventListener('pointerdown',e=>{if(e.target.id===id){if(id==='buildingModal')closeBuildingEditor();else closeMaskEditor()}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('maskModal').hidden)closeMaskEditor();else if(!$('buildingModal').hidden)closeBuildingEditor()}});
 setInterval(updateConstructionCounters,1500);
 requestDraw();
}
initConstructionSystem();
