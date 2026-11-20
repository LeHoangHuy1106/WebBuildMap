'use strict';
// v23: tile-owned Deco. One map, no Level-specific Deco sets.
// Placement uses local tile coordinates with (0,0) at the tile CENTER.
const decoObjects=new Map(); // tile key => array of {id,tileX,tileY,x,y,width,height,assetId,group,rotation}
const decoImageCache=new Map();
let decoEditingCell=null,decoDraft=[],decoSelectedId=null,decoClipboard=[],decoDragging=null,decoSnap=[],decoActionCell=null;
const DECO_STORAGE='tnvq_map_decorations_v23';
const DECO_CANVAS_SIZE=560,DECO_PREVIEW={x:160,y:185,size:240};
function decoClone(o){return JSON.parse(JSON.stringify(o))}
function decoNewId(){return 'deco_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)}
function decoItems(tileKey){return decoObjects.get(tileKey)||[]}
function decorationsAt(tileKey){return decoClone(decoItems(tileKey))}
function dropDecorationsAt(tileKey){decoObjects.delete(tileKey)}
function restoreDecorationsAt(tileKey,list){
 if(!map.has(tileKey)){decoObjects.delete(tileKey);return}
 if(Array.isArray(list)&&list.length)decoObjects.set(tileKey,decoClone(list));else decoObjects.delete(tileKey);
 requestDraw();
}
function allDecorations(){return [...decoObjects.values()].flatMap(group=>group.map(decoClone))}
function clearAllDecorations(){decoObjects.clear();requestDraw()}
function restoreAllDecorations(rows){
 decoObjects.clear();if(Array.isArray(rows))for(const row of rows){
  const tx=Number(row.tileX),ty=Number(row.tileY),w=Number(row.width),h=Number(row.height);
  if(!Number.isInteger(tx)||!Number.isInteger(ty)||!map.has(key(tx,ty))||!Number.isFinite(w)||!Number.isFinite(h)||w<2||h<2)continue;
  if(!/^[A-Za-z][A-Za-z0-9_-]*$/.test(String(row.group||''))||!String(row.assetId||''))continue;
  const item={id:String(row.id||decoNewId()),tileX:tx,tileY:ty,x:Number(row.x)||0,y:Number(row.y)||0,width:Math.min(2500,w),height:Math.min(2500,h),group:row.group,assetId:String(row.assetId),rotation:safeRotation(row.rotation||0)};
  const k=key(tx,ty);if(!decoObjects.has(k))decoObjects.set(k,[]);decoObjects.get(k).push(item);
 }requestDraw();
}
function decoDataFile(){return{format:'tnvq-decorations',schemaVersion:1,tileSize:TS,coordinateSystem:'tile-center-local-px',decorations:allDecorations()}}
function saveDecorationsLocal(){try{localStorage.setItem(DECO_STORAGE,JSON.stringify(decoDataFile()))}catch(err){console.warn('Deco save error:',err)}}
function refreshDecoManifest(){
 if(typeof mergeDecoLightManifest==='function')mergeDecoLightManifest();
 // Clear obsolete blob URLs on scan: Image instances belonging to removed paths must be rebuilt.
 decoImageCache.clear();
 for(const list of Object.values(ASSET_MANIFEST.decoGroups||{}))for(const row of list){
  if(!row.path)continue;const im=new Image();im.onload=()=>{requestDraw();if(!$('decoModal').hidden)drawDecoPreview()};
  im.onerror=()=>console.warn('Missing Deco PNG',row.group,row.id,row.path);im.src=row.path;decoImageCache.set(row.path,im);
 }
 if(!$('decoModal').hidden){updateDecoGroupOptions();renderDecoAssets();drawDecoPreview()}
 requestDraw();
}
function decoAsset(group,id){return(ASSET_MANIFEST.decoGroups?.[group]||[]).find(a=>a.id===id)}
function decoImage(item){const a=decoAsset(item.group,item.assetId);return a&&decoImageCache.get(a.path)}
// Sort point comes ONLY from Asset Settings; (X=0) means the image horizontal center.
function decoSortPoint(group,id){return{x:.5,y:assetSortY('Deco/'+group+'/'+id,1)};}
function decoSortWorldPosition(item){
 const wy=(item.tileY+.5)*TS+item.y;
 const point=decoSortPoint(item.group,item.assetId);
 const angle=(item.rotation||0)*Math.PI/180,dy=(point.y-1)*item.height;
 // X is always centered; rotated sprites use the transformed Y offset.
 return{y:wy+Math.cos(angle)*dy};
}
function decoSceneItems(){
 const out=[];for(const [k,list] of decoObjects){if(!map.has(k))continue;
  for(const item of list){const im=decoImage(item);if(!im?.naturalWidth)continue;
   const wx=(item.tileX+.5)*TS+item.x,wy=(item.tileY+.5)*TS+item.y;
   const sizeW=item.width*zoom,sizeH=item.height*zoom,s=toScreen(wx,wy);
   if(s.x+sizeW<-100||s.x-sizeW>vw+100||s.y+sizeH<0||s.y-sizeH>vh+100)continue;
   const sortPos=decoSortWorldPosition(item);
   out.push({worldY:sortPos.y,worldX:wx,worldYAnchor:sortPos.y,image:im,castsShadow:true,
    draw(){ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.translate(s.x,s.y);ctx.rotate((item.rotation||0)*Math.PI/180);ctx.drawImage(im,-sizeW/2,-sizeH,sizeW,sizeH);ctx.restore()},
    drawShadow(){castFullSpriteShadow(im,wx,wy,sizeW,sizeH,.5,1,false,.66)}
   });
  }
 }return out;
}
function drawStaticWorldObjects(){
 const objects=[];
 if(typeof constructionSceneItems==='function')objects.push(...constructionSceneItems());
 objects.push(...decoSceneItems());objects.sort((a,b)=>a.worldY-b.worldY);
 for(const item of objects)item.draw(ctx);
}
function renderDecoAssetBrowser(target){
 const groups=ASSET_MANIFEST.decoGroups||{};const entries=Object.entries(groups),all=entries.flatMap(([group,list])=>list.map(item=>({...item,group})));
 $('assetCount').textContent=`${entries.length} nhóm · ${all.length} sprite Deco (không theo Level)`;
 if(!all.length){const p=document.createElement('div');p.className='asset-placeholder';p.textContent='Thêm Deco/Trees/tree_01.png hoặc Deco/TrashBins/bin_01.png rồi Quét thư mục Sprites hoặc chạy scan_assets.py.';target.append(p);return}
 for(const row of all){const card=spriteCard({...row,level:0},'Deco');card.title='Nhóm '+row.group+' · Dùng công cụ 🌳 Trang trí để đặt lên một ô';const lb=card.querySelector('.asset-badge');if(lb)lb.textContent='Nhóm '+row.group;card.style.cursor='pointer';card.onclick=()=>{setTool('decorate');notify('Chọn ô trên map để trang trí: '+row.group+'/'+row.id)};target.append(card)}
}
function showTileActions(cell){
 if(!map.has(key(cell.x,cell.y)))return false;
 decoActionCell={x:cell.x,y:cell.y};$('tileActionLocation').textContent=`Ô (${cell.x}, ${cell.y})`;
 const tile=map.get(key(cell.x,cell.y));const canBuild=constructionObjects.has(key(cell.x,cell.y))||(tile?.code==='305'&&tile.landType===1);
 $('tileActionBuilding').disabled=!canBuild;$('tileActionBuilding').title=canBuild?'':'Chỉ áp dụng với ô đất xây dựng / công trình đã xây';
 $('tileActionModal').hidden=false;return true;
}
function openDecoEditorForTile(cell){
 if(!map.has(key(cell.x,cell.y))){notify('Cần đặt tile trước khi trang trí');return true}
 decoEditingCell={...cell};decoDraft=decorationsAt(key(cell.x,cell.y));decoSelectedId=decoDraft[decoDraft.length-1]?.id||null;
 $('decoLocation').textContent=`Ô (${cell.x}, ${cell.y}) · ${map.get(key(cell.x,cell.y))?.code} · ${decoDraft.length} object`;
 $('decoModal').hidden=false;
 updateDecoGroupOptions();renderDecoAssets();refreshDecoObjectList();drawDecoPreview();return true;
}
function decoCurrent(){return decoDraft.find(o=>o.id===decoSelectedId)}
function updateDecoGroupOptions(){
 const sel=$('decoGroup'),prev=sel.value,groups=Object.keys(ASSET_MANIFEST.decoGroups||{}).sort();
 sel.replaceChildren();if(!groups.length){sel.add(new Option('Chưa có nhóm', ''));return}
 for(const group of groups)sel.add(new Option(group+' · '+ASSET_MANIFEST.decoGroups[group].length,group));
 sel.value=groups.includes(prev)?prev:groups[0];
}
function renderDecoAssets(){
 const parent=$('decoSpriteList');parent.replaceChildren();const list=ASSET_MANIFEST.decoGroups?.[$('decoGroup').value]||[];
 if(!list.length){const hint=document.createElement('small');hint.textContent='Nhóm rỗng. Thêm PNG rồi quét lại thư mục Sprites.';parent.append(hint)}
 for(const a of list){const button=document.createElement('button');button.type='button';button.className='deco-sprite';button.title='Thêm '+a.id+' vào ô';const img=document.createElement('img');img.src=a.path;const label=document.createElement('small');label.textContent=a.id;button.append(img,label);button.onclick=()=>addDecoFromAsset(a);parent.append(button)}
}
function addDecoFromAsset(a){
 if(!decoEditingCell)return;const im=decoImageCache.get(a.path),iw=im?.naturalWidth||64,ih=im?.naturalHeight||64;
 const w=Math.round(Math.min(84,iw)),h=Math.max(2,Math.round(w*ih/iw));
 const item={id:decoNewId(),tileX:decoEditingCell.x,tileY:decoEditingCell.y,x:0,y:0,width:w,height:h,rotation:0,group:a.group,assetId:a.id};
 decoDraft.push(item);decoSelectedId=item.id;refreshDecoObjectList();drawDecoPreview();
}
function refreshDecoObjectList(){
 const list=$('decoObjectList');list.replaceChildren();for(const obj of decoDraft){list.add(new Option(obj.group+' / '+obj.assetId,obj.id))}
 if(decoSelectedId&&decoDraft.some(o=>o.id===decoSelectedId))list.value=decoSelectedId;
 const obj=decoCurrent();for(const id of ['decoX','decoY','decoWidth','decoHeight','decoRotation'])$(''+id).disabled=!obj;
 $('decoRemove').disabled=$('decoDuplicate').disabled=!obj;

 if(!obj)return;
 $('decoX').value=Math.round(obj.x*10)/10;$('decoY').value=Math.round(obj.y*10)/10;
 $('decoWidth').value=Math.round(obj.width*10)/10;$('decoHeight').value=Math.round(obj.height*10)/10;
 $('decoRotation').value=String(obj.rotation||0);
}
function commitDecoEditor(){
 if(!decoEditingCell)return;
 const tileKey=key(decoEditingCell.x,decoEditingCell.y),before=decorationsAt(tileKey),after=decoClone(decoDraft);
 if(JSON.stringify(before)!==JSON.stringify(after)){
  history.push({type:'deco',key:tileKey,before,after});if(history.length>80)history.shift();future=[];
 }
 restoreDecorationsAt(tileKey,after);updateStats();
 saveSoon();notify(`Đã lưu ${decoDraft.length} Deco trong ô (${decoEditingCell.x}, ${decoEditingCell.y})`);closeDecoEditor();
}
function closeDecoEditor(){decoEditingCell=null;decoDraft=[];decoSelectedId=null;decoDragging=null;$('decoModal').hidden=true;requestDraw()}
function decoGeometry(item){const {x,y,size}=DECO_PREVIEW,scale=size/TS;
 const wx=x+(TS/2+item.x)*scale,wy=y+(TS/2+item.y)*scale,w=item.width*scale,h=item.height*scale;
 return {x:wx-w/2,y:wy-h,w,h,ax:wx,ay:wy};
}
function drawDecoPreview(){
 const canvas=$('decoCanvas');if(!canvas)return;const c=canvas.getContext('2d'),{x,y,size}=DECO_PREVIEW,scale=size/TS;
 c.clearRect(0,0,560,560);c.fillStyle='#eee4d7';c.fillRect(0,0,560,560);
 c.fillStyle='#dad3c4';c.fillRect(x,y,size,size);
 const cell=decoEditingCell;if(!cell)return;const tile=map.get(key(cell.x,cell.y));
 const img=tile&&tileImages[tile.code==='305'&&tile.landType===1?'313':tile.code==='314'?'305':tile.code];
 if(img?.naturalWidth){c.save();if(tile.rotation){c.translate(x+size/2,y+size/2);c.rotate(tile.rotation*Math.PI/180);c.drawImage(img,-size/2,-size/2,size,size)}else c.drawImage(img,x,y,size,size);c.restore()}
 // The editor uses the same Y-sort as the world: buildings and Deco are interleaved.
 const layers=[];
 const building=constructionObjects.get(key(cell.x,cell.y));
 if(building){const pos=constructionPlacement(building);if(pos){
  const lx=x+(pos.left-cell.x*TS)*scale,ty=y+(pos.top-cell.y*TS)*scale;
  layers.push({sortY:pos.worldY+(assetSortY(`Constructions/Level_${building.level}/Houses/${building.houseId}`,1)-1)*pos.height,draw:()=>drawConstructionComposite(c,building,lx,ty,pos.width*scale,pos.height*scale,!shopIsOpen())});
 }}
 for(const item of decoDraft){const im=decoImage(item);if(!im?.naturalWidth)continue;
  const geom=decoGeometry(item);
  layers.push({sortY:decoSortWorldPosition(item).y,draw:()=>{
   c.save();c.imageSmoothingEnabled=true;c.translate(geom.ax,geom.ay);c.rotate((item.rotation||0)*Math.PI/180);
   c.drawImage(im,-geom.w/2,-geom.h,geom.w,geom.h);c.restore();
  }});
 }
 layers.sort((a,b)=>a.sortY-b.sortY);for(const layer of layers)layer.draw();
 // Guides are above objects for precise placement.
 c.save();c.setLineDash([5,5]);for(const entry of [{tag:'centerX',axis:'v',v:x+size/2},{tag:'centerY',axis:'h',v:y+size/2},{tag:'left',axis:'v',v:x},{tag:'right',axis:'v',v:x+size},{tag:'top',axis:'h',v:y},{tag:'bottom',axis:'h',v:y+size}]){
  const on=decoSnap.includes(entry.tag);c.strokeStyle=on?'#00b6ef':'rgba(40,90,126,.23)';c.lineWidth=on?2.5:1;c.beginPath();
  if(entry.axis==='v'){c.moveTo(entry.v,5);c.lineTo(entry.v,555)}else{c.moveTo(5,entry.v);c.lineTo(555,entry.v)}c.stroke();
 }c.restore();
 const selected=decoCurrent();
 if(selected&&decoImage(selected)?.naturalWidth){const geom=decoGeometry(selected);
  const point=decoSortPoint(selected.group,selected.assetId),angle=(selected.rotation||0)*Math.PI/180;
  const dx=(point.x-.5)*geom.w,dy=(point.y-1)*geom.h;
  const sx=geom.ax+Math.cos(angle)*dx-Math.sin(angle)*dy,sy=geom.ay+Math.sin(angle)*dx+Math.cos(angle)*dy;
  c.save();c.beginPath();c.arc(sx,sy,6,0,Math.PI*2);c.fillStyle='#00eeff';c.fill();c.strokeStyle='#123844';c.lineWidth=2;c.stroke();
  c.strokeStyle='#0098bc';c.setLineDash([5,3]);c.strokeRect(geom.x,geom.y,geom.w,geom.h);c.setLineDash([]);
  c.fillStyle='#fff';c.strokeStyle='#0098bc';c.fillRect(geom.x+geom.w-7,geom.y+geom.h-7,14,14);c.strokeRect(geom.x+geom.w-7,geom.y+geom.h-7,14,14);c.restore();
 }
 c.strokeStyle='#657589';c.lineWidth=1.5;c.strokeRect(x,y,size,size);
 c.fillStyle='#3a5061';c.font='12px Arial';c.fillText('Tâm: (0, 0) · Tile 120×120',14,546);
}
function decoPointerXY(e){const canvas=$('decoCanvas'),r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
function decoHitTest(p){const sorted=[...decoDraft].sort((a,b)=>decoSortWorldPosition(b).y-decoSortWorldPosition(a).y);
 for(const item of sorted){const g=decoGeometry(item);
  if(p.x>=g.x-9&&p.x<=g.x+g.w+9&&p.y>=g.y-9&&p.y<=g.y+g.h+9)return item;
 }return null}
function decoSnapMove(obj){
 const lines=[];let x=obj.x,y=obj.y;const tol=3.8;
 if(Math.abs(x)<tol){x=0;lines.push('centerX')}
 if(Math.abs(y)<tol){y=0;lines.push('centerY')}
 if(Math.abs((x-obj.width/2)+60)<tol){x=-60+obj.width/2;lines.push('left')}
 if(Math.abs((x+obj.width/2)-60)<tol){x=60-obj.width/2;lines.push('right')}
 if(Math.abs((y-obj.height)+60)<tol){y=-60+obj.height;lines.push('top')}
 if(Math.abs(y-60)<tol){y=60;lines.push('bottom')}
 obj.x=x;obj.y=y;decoSnap=lines;
}
function decoPointerDown(e){
 if(!decoEditingCell)return;const p=decoPointerXY(e),obj=decoHitTest(p);if(!obj)return;
 decoSelectedId=obj.id;const g=decoGeometry(obj);const isResize=Math.abs(p.x-(g.x+g.w))<17&&Math.abs(p.y-(g.y+g.h))<17;
 decoDragging={kind:isResize?'resize':'move',start:p,origin:{x:obj.x,y:obj.y,width:obj.width,height:obj.height},itemId:obj.id};
 $('decoCanvas').setPointerCapture(e.pointerId);$('decoCanvas').classList.add('dragging');refreshDecoObjectList();drawDecoPreview();e.preventDefault();
}
function decoPointerMove(e){
 if(!decoDragging)return;const p=decoPointerXY(e),obj=decoCurrent();if(!obj)return;
 const dx=(p.x-decoDragging.start.x)*TS/DECO_PREVIEW.size,dy=(p.y-decoDragging.start.y)*TS/DECO_PREVIEW.size;
 const orig=decoDragging.origin;
 if(decoDragging.kind==='resize'){
  const aspect=orig.height/orig.width;const increase=Math.max(dx,dy/Math.max(.01,aspect));obj.width=Math.max(2,Math.min(2000,Math.round((orig.width+increase)*10)/10));obj.height=Math.round(obj.width*aspect*10)/10;decoSnap=[];
 }else{obj.x=Math.round((orig.x+dx)*10)/10;obj.y=Math.round((orig.y+dy)*10)/10;decoSnapMove(obj)}
 refreshDecoObjectList();drawDecoPreview();
}
function decoPointerUp(){decoDragging=null;decoSnap=[];$('decoCanvas').classList.remove('dragging');drawDecoPreview()}
function changeDecoField(id){const obj=decoCurrent();if(!obj)return;const value=Number($(id).value);if(!Number.isFinite(value))return;
 if(id==='decoX')obj.x=value;else if(id==='decoY')obj.y=value;
 else if(id==='decoRotation')obj.rotation=safeRotation(value);
 else{
  const im=decoImage(obj),aspect=im?.naturalWidth?im.naturalHeight/im.naturalWidth:obj.height/obj.width;
  if(id==='decoWidth'){obj.width=Math.max(2,value);obj.height=Math.round(obj.width*aspect*100)/100}
  else{obj.height=Math.max(2,value);obj.width=Math.round(obj.height/aspect*100)/100}
 }
 decoSnap=[];refreshDecoObjectList();drawDecoPreview();
}
function exportDecoFile(){download('decorations.json',JSON.stringify(decoDataFile(),null,2));notify('Đã xuất decorations.json')}
async function importDecoFile(e){const f=e.target.files?.[0];if(!f)return;try{
 const data=JSON.parse(await f.text());if(data.tileSize!==120||!Array.isArray(data.decorations))throw new Error('File không phải decorations.json chuẩn 120px');
 if(!confirm(`Nhập ${data.decorations.length} Deco và thay thế toàn bộ trang trí hiện tại?`))return;
 restoreAllDecorations(data.decorations);saveSoon();if(decoEditingCell){decoDraft=decorationsAt(key(decoEditingCell.x,decoEditingCell.y));decoSelectedId=decoDraft[0]?.id||null;refreshDecoObjectList();drawDecoPreview()}
 notify('Đã nhập '+allDecorations().length+' Deco hợp lệ, ô không tồn tại được bỏ qua');
 }catch(err){alert('Lỗi nhập decorations.json: '+err.message)}finally{e.target.value=''}}
function initDecoEditor(){
 refreshDecoManifest();
 try{const saved=JSON.parse(localStorage.getItem(DECO_STORAGE)||'null');if(saved?.decorations)restoreAllDecorations(saved.decorations)}catch(err){console.warn('Decorations storage invalid',err)}
 $('tileActionDeco').onclick=()=>{const cell=decoActionCell;$('tileActionModal').hidden=true;if(cell)openDecoEditorForTile(cell)};
 $('tileActionBuilding').onclick=()=>{const cell=decoActionCell;$('tileActionModal').hidden=true;if(cell)openBuildingEditor(cell)};
 $('closeTileActions').onclick=()=>{$('tileActionModal').hidden=true};
 $('decoClose').onclick=$('decoCancel').onclick=closeDecoEditor;$('decoSave').onclick=commitDecoEditor;
 $('decoGroup').onchange=renderDecoAssets;
 $('decoObjectList').onchange=e=>{decoSelectedId=e.target.value;refreshDecoObjectList();drawDecoPreview()};
 for(const id of ['decoX','decoY','decoWidth','decoHeight','decoRotation'])$(id).addEventListener('change',()=>changeDecoField(id));
 $('decoRemove').onclick=()=>{decoDraft=decoDraft.filter(o=>o.id!==decoSelectedId);decoSelectedId=decoDraft.at(-1)?.id||null;refreshDecoObjectList();drawDecoPreview()};
 $('decoDuplicate').onclick=()=>{const o=decoCurrent();if(!o)return;const next={...o,id:decoNewId(),x:o.x+8,y:o.y+8};decoDraft.push(next);decoSelectedId=next.id;refreshDecoObjectList();drawDecoPreview()};
 $('decoCopy').onclick=()=>{decoClipboard=decoClone(decoDraft);notify(`Đã copy ${decoClipboard.length} Deco của ô này`)};
 $('decoPaste').onclick=()=>{if(!decoEditingCell)return;if(!decoClipboard.length){notify('Chưa có Deco để paste');return}for(const o of decoClipboard)decoDraft.push({...decoClone(o),id:decoNewId(),tileX:decoEditingCell.x,tileY:decoEditingCell.y});decoSelectedId=decoDraft.at(-1)?.id||null;refreshDecoObjectList();drawDecoPreview();notify('Đã paste '+decoClipboard.length+' Deco vào ô; bấm Lưu để xác nhận')};
 $('decoExport').onclick=exportDecoFile;$('decoImport').onchange=importDecoFile;
 $('decoCanvas').addEventListener('pointerdown',decoPointerDown);$('decoCanvas').addEventListener('pointermove',decoPointerMove);$('decoCanvas').addEventListener('pointerup',decoPointerUp);$('decoCanvas').addEventListener('pointercancel',decoPointerUp);
 for(const id of ['tileActionModal','decoModal'])$(id).addEventListener('pointerdown',e=>{if(e.target.id===id){if(id==='decoModal')closeDecoEditor();else $(id).hidden=true}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('decoModal').hidden)closeDecoEditor();else if(!$('tileActionModal').hidden)$('tileActionModal').hidden=true}});
 const label=document.querySelector('label.deco-import');label.style.cssText='border:1px solid #b7cbd3;background:#ebf1f7;color:#34465b;padding:8px 10px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700';
 // A discoverable JSON export/import control also lives in the map inspector.
 const inspector=document.querySelector('.map-edit-inspector');if(inspector){const box=document.createElement('div');box.className='ins-card';box.innerHTML='<div class="ins-title">🌳 Trang trí trên Tile</div><p class="note">Chọn công cụ 🌳 Trang trí rồi click bất kỳ tile đã đặt. Các object gắn với ô, xóa ô sẽ xóa cả Deco.</p><button id="decoExportInspector" class="btn">⇩ Xuất decorations.json</button> <label id="decoImportInspectorLabel" class="btn" style="display:inline-block;cursor:pointer">⇧ Nhập JSON<input id="decoImportInspector" type="file" accept=".json" hidden></label>';inspector.append(box);$('decoExportInspector').onclick=exportDecoFile;$('decoImportInspector').onchange=importDecoFile}
 requestDraw();
}
initDecoEditor();
