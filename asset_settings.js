'use strict';
// v25: Asset-library-only modal. A category/id has ONE shared Y sort coordinate.
// This script loads last, once the core editor / Deco / Buildings have been initialized.
const assetSettingState={key:'',category:'',value:1,defaultY:1,sortEnabled:true,image:null,rect:null,dragging:false};
function assetSortIdentity(category,record){
 if(category==='Deco')return 'Deco/'+record.group+'/'+record.id;
 if(category==='Roads')return 'Roads/Level_'+record.level+'/'+record.id;
 if(category==='Cars')return 'Vehicles/Cars/'+record.id;
 if(category==='Pedestrians')return 'Pedestrians/'+record.id;
 if(category==='Vehicles/Bikes')return 'Vehicles/Bikes/'+record.id;
 if(category.startsWith('Constructions/'))return category+'/'+record.id;
 return category+'/'+record.id;
}
function assetSortPreviewPath(category,record){
 if(category==='Vehicles/Bikes')return record.right||record.path||'';
 if(category==='Pedestrians')return record.frames?.down?.[0]||record.path||'';
 return record.path||'';
}
function assetDefaultSortY(category){
 if(category==='Vehicles/Bikes')return .76;
 if(category==='Pedestrians')return .97;
 return 1;
}
function assetSupportsYSort(category){
 return category==='Deco'||category==='Pedestrians'||category==='Vehicles/Bikes'||/Constructions\/Level_\d+\/Houses/.test(category);
}
function openAssetSettings(category,record){
 const state=assetSettingState;
 state.key=assetSortIdentity(category,record);state.category=category;
 state.defaultY=assetDefaultSortY(category);state.value=assetSortY(state.key,state.defaultY);
 state.sortEnabled=assetSupportsYSort(category);state.dragging=false;state.image=null;state.rect=null;state.sourceRecord=record;
 $('assetOpenDecoLights').hidden=category!=='Deco';
 $('assetSettingsTitle').textContent=category+' / '+record.id;
 $('assetSettingsPath').textContent=state.key;
 $('assetSortYInput').disabled=!state.sortEnabled;
 $('assetSortReset').disabled=!state.sortEnabled;
 $('assetSortApply').disabled=!state.sortEnabled;
 $('assetSettingsHelp').textContent=state.sortEnabled
  ?'Kéo chấm vàng theo chiều DỌC, hoặc click vào chiều cao của hình. X cố định ở chính giữa (X = 0). Điểm này chỉ quyết định che khuất, không thay đổi vị trí hiển thị của sprite.'
  :'Asset này không cần Y-sort riêng: Roads là lớp nền; Interior/ClosedDoor là phần ghép vào House. Dùng Settings của House để điều chỉnh thứ tự hiển thị.';
 $('assetSettingsEffect').textContent=state.sortEnabled
  ?'Mọi bản sao của '+record.id+' đều dùng chung giá trị này, bất kể đặt ở ô nào. Giá trị được lưu theo đường dẫn asset.'
  :'Chỉ xem ảnh và thông tin asset. Không áp dụng sort cho loại này.';
 $('assetSortYInput').value=(state.value*100).toFixed(1).replace(/\.0$/,'');
 $('assetSettingsModal').hidden=false;
 const image=new Image();state.image=image;
 image.onload=()=>{if(state.image===image)drawAssetSettingsPreview()};
 image.onerror=()=>{if(state.image===image)drawAssetSettingsPreview()};
 image.src=assetSortPreviewPath(category,record);
 drawAssetSettingsPreview();
}
function closeAssetSettings(){assetSettingState.dragging=false;$('assetSettingsModal').hidden=true;}
function drawAssetSettingsPreview(){
 const c=$('assetSortCanvas'),g=c.getContext('2d');if(!g)return;
 const W=c.width,H=c.height,img=assetSettingState.image;
 g.clearRect(0,0,W,H);
 g.fillStyle='#162940';g.fillRect(0,0,W,H);
 const checker=22;for(let y=0;y<H;y+=checker)for(let x=0;x<W;x+=checker){
  if(((x/checker+y/checker)&1)===0){g.fillStyle='#203751';g.fillRect(x,y,checker,checker)}
 }
 g.fillStyle='#b4cde5';g.font='bold 12px system-ui';g.textAlign='left';g.fillText('PREVIEW / SORT Y',16,22);
 const nw=img?.naturalWidth||0,nh=img?.naturalHeight||0;
 const maxW=W-86,maxH=H-100;
 const scale=nw&&nh?Math.min(maxW/nw,maxH/nh):1;
 const dw=nw*scale,dh=nh*scale,x=(W-dw)/2,y=(H-dh)/2+10;
 if(nw&&nh){
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(img,x,y,dw,dh);
  assetSettingState.rect={x,y,width:dw,height:dh};
 }else{
  assetSettingState.rect=null;
  g.fillStyle='#b1c5dc';g.font='13px system-ui';g.textAlign='center';g.fillText('Đang tải ảnh preview...',W/2,H/2);
 }
 if(!assetSettingState.rect)return;
 const ay=y+dh*assetSettingState.value;
 g.save();g.beginPath();g.setLineDash([6,4]);g.strokeStyle='#e8b866';g.lineWidth=1.5;g.moveTo(x-14,ay);g.lineTo(x+dw+14,ay);g.stroke();g.setLineDash([]);
 g.beginPath();g.strokeStyle='rgba(239,242,252,.8)';g.lineWidth=1.5;g.moveTo(W/2,y-13);g.lineTo(W/2,y+dh+13);g.stroke();
 g.beginPath();g.arc(W/2,ay,11,0,2*Math.PI);g.fillStyle=assetSettingState.sortEnabled?'#fac351':'#abb8c5';g.fill();g.strokeStyle='#264451';g.lineWidth=3;g.stroke();
 g.fillStyle='#f8dfaa';g.font='bold 12px system-ui';g.textAlign='left';
 g.fillText('X = 0  |  Y = '+(assetSettingState.value*100).toFixed(1).replace(/\.0$/,'')+'%',16,H-13);
 g.restore();
}
function moveAssetSortPointer(event){
 if(!assetSettingState.sortEnabled||!assetSettingState.rect)return;
 const canvas=$('assetSortCanvas'),bounds=canvas.getBoundingClientRect();
 const cy=(event.clientY-bounds.top)*canvas.height/bounds.height;
 const rect=assetSettingState.rect;
 assetSettingState.value=Math.round(Math.max(0,Math.min(1,(cy-rect.y)/rect.height))*1000)/1000;
 $('assetSortYInput').value=(assetSettingState.value*100).toFixed(1).replace(/\.0$/,'');drawAssetSettingsPreview();
}
function exportAssetSortSettings(){
 const data={version:2,units:'normalized',axis:'y',x:0,points:ASSET_MANIFEST.assetSortY||{}};
 download('asset_sort_y.json',JSON.stringify(data,null,2)+'\n');
 notify('Đã xuất asset_sort_y.json · đặt vào Asset/Sprites/ rồi quét lại hoặc chạy scan_assets.py');
}
function applyAssetSortSettings(){
 const st=assetSettingState;if(!st.sortEnabled)return;
 const parsed=Number($('assetSortYInput').value);
 if(!Number.isFinite(parsed)||parsed<0||parsed>100){notify('Sort Y phải từ 0 đến 100%');return}
 st.value=Math.round(parsed*10)/1000;
 ASSET_MANIFEST.assetSortY??={};ASSET_MANIFEST.assetSortY[st.key]=st.value;
 try{localStorage.setItem(ASSET_SORT_STORAGE,JSON.stringify({version:2,points:ASSET_MANIFEST.assetSortY}))}catch(e){console.warn('Cannot persist Asset Settings',e)}
 if(typeof drawDecoPreview==='function'&&$('decoModal')&&!$('decoModal').hidden)drawDecoPreview();
 if(typeof drawBuildingPreview==='function'&&$('buildingModal')&&!$('buildingModal').hidden)drawBuildingPreview();
 requestDraw();
 notify('Đã lưu Sort Y '+Math.round(st.value*1000)/10+'% cho '+st.key+' · mọi bản sao dùng chung');
 closeAssetSettings();
}
$('assetSettingsClose').onclick=closeAssetSettings;
$('assetSortReset').onclick=()=>{assetSettingState.value=assetSettingState.defaultY;$('assetSortYInput').value=assetSettingState.value*100;drawAssetSettingsPreview()};
$('assetSortExport').onclick=exportAssetSortSettings;
$('assetSettingsExportFooter').onclick=exportAssetSortSettings;
$('assetSortApply').onclick=applyAssetSortSettings;
$('assetSortYInput').oninput=e=>{
 if(!assetSettingState.sortEnabled)return;const value=Number(e.target.value);
 if(e.target.value.trim()!==''&&Number.isFinite(value)&&value>=0&&value<=100){assetSettingState.value=value/100;drawAssetSettingsPreview()}
};
$('assetSortCanvas').onpointerdown=e=>{
 if(!assetSettingState.sortEnabled||!assetSettingState.rect)return;
 assetSettingState.dragging=true;$('assetSortCanvas').setPointerCapture(e.pointerId);moveAssetSortPointer(e);e.preventDefault()
};
$('assetSortCanvas').onpointermove=e=>{if(assetSettingState.dragging){moveAssetSortPointer(e);e.preventDefault()}};
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('assetSortCanvas').addEventListener(name,()=>{assetSettingState.dragging=false});
$('assetSortCanvas').onkeydown=e=>{
 if(!assetSettingState.sortEnabled)return;
 if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Home'||e.key==='End'){
  const d=e.shiftKey?.05:.01;
  if(e.key==='Home')assetSettingState.value=0;
  else if(e.key==='End')assetSettingState.value=1;
  else assetSettingState.value=Math.max(0,Math.min(1,assetSettingState.value+(e.key==='ArrowDown'?d:-d)));
  $('assetSortYInput').value=(assetSettingState.value*100).toFixed(1);drawAssetSettingsPreview();e.preventDefault();e.stopPropagation();
 }
};
$('assetSettingsModal').addEventListener('pointerdown',e=>{if(e.target===$('assetSettingsModal'))closeAssetSettings()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('assetSettingsModal').hidden){closeAssetSettings();e.stopPropagation()}});

$('assetOpenDecoLights').onclick=()=>{const row=assetSettingState.sourceRecord;if(assetSettingState.category==='Deco'&&row&&typeof openDecoLightEditor==='function'){closeAssetSettings();openDecoLightEditor(row)}};
