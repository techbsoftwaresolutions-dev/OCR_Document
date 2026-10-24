import React,{createContext,useContext,useEffect,useState,useRef} from 'react';
import{createRoot}from'react-dom/client';
import{BrowserRouter,NavLink,Navigate,Route,Routes,useNavigate,useParams,useLocation}from'react-router-dom';
import axios from 'axios';
import{LayoutDashboard,UploadCloud,Files,Users,ChartNoAxesCombined,Settings,LogOut,FileSearch,ShieldCheck,FileCheck2,AlertTriangle,CheckCircle2,ArrowRight,Sun,Moon,Menu,X,Plus,Trash2,Download,Search,Eye,RefreshCcw,FileText,ScanLine,ChevronRight,LockKeyhole,Mail,UserRound,CalendarClock,CloudUpload}from'lucide-react';
import{ResponsiveContainer,PieChart,Pie,Cell,Tooltip,BarChart,Bar,XAxis,YAxis,CartesianGrid}from'recharts';
import './style.css';
import {groupDocuments,mergeDocumentFields} from './document-groups.js';
const api=axios.create({baseURL:'/api'});api.interceptors.request.use(config=>{const t=localStorage.getItem('smartdoc_token');if(t)config.headers.Authorization=`Bearer ${t}`;return config});
const Auth=createContext(null);const useAuth=()=>useContext(Auth);
function App(){const[user,setUser]=useState(JSON.parse(localStorage.getItem('smartdoc_user')||'null'));const[theme,setTheme]=useState(localStorage.getItem('smartdoc_theme')||'light');useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('smartdoc_theme',theme)},[theme]);const signin=(data)=>{localStorage.setItem('smartdoc_token',data.token);localStorage.setItem('smartdoc_user',JSON.stringify(data.user));setUser(data.user)};const logout=()=>{localStorage.removeItem('smartdoc_token');localStorage.removeItem('smartdoc_user');setUser(null)};return <Auth.Provider value={{user,signin,logout,theme,setTheme}}><BrowserRouter><Routes><Route path="/login" element={user?<Navigate to="/dashboard"/>:<Login/>}/><Route path="/register" element={user?<Navigate to="/dashboard"/>:<Login register/>}/><Route path="/" element={<Navigate to={user?'/dashboard':'/login'}/>}/><Route path="/*" element={user?<Shell/>:<Navigate to="/login"/>}/></Routes></BrowserRouter></Auth.Provider>}
const short=(text='')=>text.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());const date=d=>d?new Date(d+'Z').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
function Login({register=false}){const[mode,setMode]=useState(register?'register':'login');const[form,setForm]=useState({name:'',email:'demo@smartdoc.local',password:'Demo@12345'});const[busy,setBusy]=useState(false);const[error,setError]=useState('');const{signin}=useAuth();const navigate=useNavigate();async function submit(e){e.preventDefault();setBusy(true);setError('');try{const {data}=await api.post('/auth/'+(mode==='register'?'register':'login'),form);signin(data.data);navigate('/dashboard')}catch(e){setError(e.response?.data?.error?.message||'Could not connect to the server.')}finally{setBusy(false)}}return <div className="auth-wrap"><div className="auth-hero"><div className="brand"><div className="brand-mark"><ScanLine size={23}/></div>SmartDoc <span>OCR</span></div><div className="hero-copy"><span className="eyebrow">DOCUMENT INTELLIGENCE PLATFORM</span><h1>Your documents.<br/><em>Instantly understood.</em></h1><p>Go from scattered paperwork to organized, editable data with secure, local-powered document processing.</p><div className="hero-features"><span><CheckCircle2/> Intelligent OCR</span><span><CheckCircle2/> Instant form autofill</span><span><CheckCircle2/> Private processing</span></div></div><div className="hero-bottom">SMARTER DATA ENTRY. LESS MANUAL WORK.</div></div><div className="auth-main"><div className="auth-card"><div className="icon-soft"><LockKeyhole size={24}/></div><h2>{mode==='register'?'Create your account':'Welcome back'}</h2><p className="muted">{mode==='register'?'Start your document workflow.':'Sign in to your document workspace.'}</p><form onSubmit={submit}>{mode==='register'&&<label>Full name<input required minLength="2" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></label>}<label>Email address<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="name@example.com"/></label><label>Password<input type="password" required minLength="8" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>{error&&<p className="error">{error}</p>}<button className="primary wide" disabled={busy}>{busy?'Working...':mode==='register'?'Create account':'Sign in'} <ArrowRight size={17}/></button></form><p className="swap">{mode==='register'?'Already have an account?':'New to SmartDoc?'} <button className="link-button" onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='register'?'Sign in':'Create account'}</button></p><div className="demo"><b>Demo access</b><span>demo@smartdoc.local / Demo@12345</span><small>Run the backend seed command first.</small></div></div></div></div>}
const nav=[['/dashboard',LayoutDashboard,'Dashboard'],['/upload',UploadCloud,'Upload documents'],['/documents',Files,'Document history'],['/profiles',Users,'Applicant profiles'],['/analytics',ChartNoAxesCombined,'Analytics'],['/settings',Settings,'Settings']];
function AccountDropdown() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="account-dropdown" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button className="avatar small account-trigger" ref={trigger} aria-label="Account options" aria-expanded={open} aria-controls="account-options" onClick={() => setOpen(value => !value)}>{user?.name?.[0]?.toUpperCase() || 'U'}</button>
    {open && <div className="account-options" id="account-options">
      <div className="account-identity"><strong>{user?.name || 'Account'}</strong><small>{user?.email}</small></div>
      <NavLink to="/settings" onClick={() => setOpen(false)}><Settings size={17}/>Settings</NavLink>
      <button onClick={logout}><LogOut size={17}/>Log out</button>
    </div>}
  </div>;
}
function Shell(){const{user,logout,theme,setTheme}=useAuth();const[mobile,setMobile]=useState(false);const location=useLocation();const title=nav.find(x=>location.pathname.startsWith(x[0]))?.[2]||'Document details';return <div className="shell"><aside className={'sidebar '+(mobile?'visible':'')}><div className="brand side-brand"><NavLink to="/" className="brand" aria-label="SmartDoc OCR homepage" onClick={()=>setMobile(false)}><div className="brand-mark"><ScanLine size={22}/></div>SmartDoc <span>OCR</span></NavLink><button className="mobile-close" onClick={()=>setMobile(false)}><X/></button></div><div className="workspace-label">WORKSPACE</div><div className="nav-list">{nav.map(([url,Icon,label])=><NavLink key={url} to={url} onClick={()=>setMobile(false)} className={({isActive})=>'nav-item '+(isActive?'active':'')}><Icon size={19}/>{label}</NavLink>)}</div><div className="sidebar-footer"><div className="trust-panel"><ShieldCheck size={21}/><b>Local-first privacy</b><small>Your documents are processed on your own server.</small></div><div className="sidebar-user"><div className="avatar">{user?.name?.[0]?.toUpperCase()}</div><span><b>{user?.name}</b><small>{user?.email}</small></span><button title="Logout" onClick={logout}><LogOut size={17}/></button></div></div></aside>{mobile&&<div className="scrim" onClick={()=>setMobile(false)}/>}<div className="main-shell"><header className="topbar"><div className="top-left"><button className="menu-trigger" onClick={()=>setMobile(true)}><Menu/></button><div className="breadcrumb">Workspace <ChevronRight size={15}/> <strong>{title}</strong></div></div><div className="top-actions"><span className="status-dot"/> <span className="top-status">Local processing</span><button title="Toggle theme" className="icon-button" onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={19}/>:<Sun size={19}/>}</button><AccountDropdown/></div></header><main className="page"><Routes><Route path="dashboard" element={<Dashboard/>}/><Route path="upload" element={<Uploader/>}/><Route path="documents" element={<Documents/>}/><Route path="documents/review" element={<BatchReview/>}/><Route path="documents/:id" element={<DocumentDetail/>}/><Route path="profiles" element={<Profiles/>}/><Route path="analytics" element={<Analytics/>}/><Route path="settings" element={<SettingsPage/>}/><Route path="*" element={<Navigate to="/dashboard"/>}/></Routes></main></div></div>}
function Heading({tag,title,subtitle,action}){return <div className="page-heading"><div><div className="eyebrow dark">{tag}</div><h1>{title}</h1><p className="muted">{subtitle}</p></div>{action}</div>}
function Empty({title='Nothing here yet',text='Start by uploading a document.',icon:Icon=Files}){return <div className="empty"><div className="empty-icon"><Icon size={27}/></div><h3>{title}</h3><p>{text}</p><NavLink className="primary" to="/upload"><Plus size={17}/> Upload a document</NavLink></div>}
function useRemote(url){const[data,setData]=useState(null);const[error,setError]=useState('');const[refresh,setRefresh]=useState(0);useEffect(()=>{let live=true;api.get(url).then(r=>live&&setData(r.data.data)).catch(e=>live&&setError(e.response?.data?.error?.message||'Server unavailable'));return()=>{live=false}},[url,refresh]);return{data,error,reload:()=>setRefresh(x=>x+1)}}
function Status({value}){return <span className={'pill '+(value==='reviewed'?'success':value==='failed'?'danger':'info')}><span className="pill-dot"/>{short(value)}</span>}
function Dashboard(){const{data:stats}=useRemote('/dashboard/stats');const{data:docs}=useRemote('/documents');const cards=[['Total documents',stats?.total||0,Files,'blue'],['Processed',stats?.processed||0,FileSearch,'purple'],['Reviewed',stats?.reviewed||0,CheckCircle2,'green'],['Failed',stats?.failed||0,AlertTriangle,'orange']];return <><Heading tag="OVERVIEW" title="Dashboard" subtitle="A clear view of your document processing workspace." action={<NavLink className="primary" to="/upload"><Plus size={17}/> New upload</NavLink>}/><div className="stats-grid">{cards.map(([label,value,Icon,color])=><div className="stat-card" key={label}><div className={'stat-icon '+color}><Icon size={21}/></div><div className="stat-num">{value}</div><div className="stat-label">{label}</div><div className="stat-foot">Across your workspace</div></div>)}</div><div className="dashboard-grid"><div className="panel"><div className="panel-head"><div><h3>Recent documents</h3><p className="muted">Latest uploads and extraction activity</p></div><NavLink className="text-link" to="/documents">View all <ArrowRight size={15}/></NavLink></div>{docs?.length?<div className="table-wrap"><table><thead><tr><th>Document</th><th>Type</th><th>Status</th><th>Date</th></tr></thead><tbody>{docs.slice(0,6).map(d=><tr key={d.id}><td><NavLink to={'/documents/'+d.id} className="document-cell"><FileText size={16}/><span>{d.filename}</span></NavLink></td><td>{short(d.category)}</td><td><Status value={d.status}/></td><td>{date(d.created_at)}</td></tr>)}</tbody></table></div>:<Empty/>}</div><div className="panel"><div className="panel-head"><div><h3>Document breakdown</h3><p className="muted">Distribution by document type</p></div></div>{stats?.total?<div className="chart-box"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={Object.entries(stats.byType).map(([name,value])=>({name:short(name),value}))} cx="50%" cy="50%" innerRadius={65} outerRadius={95} dataKey="value" paddingAngle={4}>{Object.keys(stats.byType).map((_,i)=><Cell key={i} fill={['#4f46e5','#0ea5e9','#14b8a6','#f59e0b','#8b5cf6'][i%5]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="legend-list">{Object.entries(stats.byType).map(([name,value],i)=><div key={name}><span className="legend-color" style={{background:['#4f46e5','#0ea5e9','#14b8a6','#f59e0b','#8b5cf6'][i%5]}}/>{short(name)} <b>{value}</b></div>)}</div></div>:<div className="chart-empty">Your document insights will appear here.</div>}</div></div><div className="cta-banner"><div><span className="eyebrow">YOUR NEXT STEP</span><h2>Less typing. More doing.</h2><p>Upload a PAN, Aadhaar, resume, or invoice and let SmartDoc prepare your form for review.</p></div><NavLink className="light-button" to="/upload">Start extracting <ArrowRight size={17}/></NavLink></div></>}
function Uploader() {
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState("auto");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const nav = useNavigate();
  const inputId = "document-upload";
  const onFiles = (fs) => {
    const array = [...fs].filter(
      (f) =>
        /\.(png|jpe?g|webp|pdf|docx|xlsx)$/i.test(f.name) && f.size <= 10 * 1024 * 1024,
    );
    setFiles((v) => [...v, ...array].slice(0, 5));
    if (array.length !== fs.length)
      setMessage(
        "Some files were skipped: only PDF/DOCX/XLSX/JPG/PNG/WEBP under 10 MB are accepted.",
      );
  };
  async function run() {
    if (!files.length) return;
    setBusy(true);
    setMessage("");
    try {
      const body = new FormData();
      files.forEach((f) => body.append("files", f));
      body.append("category", category);
      const response = await api.post("/documents/upload", body, {
        onUploadProgress: (e) =>
          setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      });
      const uploaded = response.data.data;
      let finished = 0;
      let failures = [];
      for (const d of uploaded) {
        setMessage(
          `Running OCR on ${d.filename} (${finished + 1}/${uploaded.length})...`,
        );
        try {
          await api.post(`/documents/${d.id}/process`);
        } catch (e) {
          failures.push(
            d.filename + ": " + (e.response?.data?.error?.message || e.message),
          );
        }
        finished++;
      }
      if (failures.length)
        setMessage("Some documents failed: " + failures.join("; "));
      if (uploaded.length === 1 && !failures.length)
        nav("/documents/" + uploaded[0].id);
      else nav("/documents/review?ids=" + uploaded.map(d => d.id).join(","), { state: { failures } });
    } catch (e) {
      setMessage(
        e.response?.data?.error?.message ||
          "Upload failed. Check the API server.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        tag="DOCUMENT WORKSPACE"
        title="Upload documents"
        subtitle="Extract information from PDF and image files, then review it before saving."
      />
      <div className="upload-layout">
        <section className="panel upload-panel">
          <div className="panel-head">
            <div>
              <h3>Select your documents</h3>
              <p className="muted">
                Originals stay on this server until you delete the document.
              </p>
            </div>
          </div>
          <div className="upload-control">
            <label>Document type</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {[
                "auto",
                "pan",
                "aadhaar",
                "resume",
                "licence",
                "registrationCertificate",
                "vehicleInsurance",
                "utilityBill",
                "bankStatement",
                "payslip",
                "receipt",
                "voter",
                "passport",
                "certificate",
                "invoice",
                "medical",
                "generic",
              ].map((v) => (
                <option key={v} value={v}>
                  {v === "auto"
                    ? "Auto detect"
                    : v === "medical"
                      ? "Medical report"
                      : v === "registrationCertificate"
                        ? "RC / registration certificate"
                      : v === "vehicleInsurance"
                        ? "Vehicle insurance"
                      : v === "utilityBill"
                        ? "Electricity / utility bill"
                      : v === "bankStatement"
                        ? "Bank statement"
                      : v === "receipt"
                        ? "Receipt"
                      : short(v)}
                </option>
              ))}
            </select>
          </div>
          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFiles(e.dataTransfer.files);
            }}
          >
            <div className="drop-icon">
              <CloudUpload size={32} />
            </div>
            <h3>Drag & drop your files here</h3>
            <p>Or browse your device to choose files</p>
            <label className="secondary browse" htmlFor={inputId}>
              Browse files
            </label>
            <input
              id={inputId}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx"
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = "";
              }}
              hidden
            />
            <small>
              PNG, JPG, WEBP or PDF • Up to 10 MB each • Max 5 files
            </small>
          </div>
          {files.length > 0 && (
            <div className="selected-files">
              <h3>Selected files ({files.length})</h3>
              {files.map((f, i) => (
                <div className="selected-file" key={i}>
                  <FileText size={19} />
                  <span>
                    <b>{f.name}</b>
                    <small>{(f.size / 1024 / 1024).toFixed(2)} MB</small>
                  </span>
                  <button
                    title="Remove file"
                    disabled={busy}
                    onClick={() =>
                      setFiles(files.filter((_, index) => index !== i))
                    }
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {message && <div className="notice">{message}</div>}
          {busy && (
            <div className="progress">
              <span style={{ width: progress + "%" }} />
            </div>
          )}
          <button
            className="primary wide upload-start"
            disabled={busy || !files.length}
            onClick={run}
          >
            {busy ? "Processing your documents..." : "Upload & extract data"}{" "}
            <ArrowRight size={18} />
          </button>
        </section>
        <section className="upload-right">
          <div className="panel tips">
            <div className="icon-soft">
              <ShieldCheck />
            </div>
            <h3>Built for privacy</h3>
            <p>
              Originals stay on your server and are available only to your
              account. Aadhaar numbers are masked in extracted text.
            </p>
          </div>
          <div className="panel tips">
            <div className="icon-soft">
              <ScanLine />
            </div>
            <h3>How it works</h3>
            <div className="step">
              <b>01</b>
              <span>Upload a document</span>
            </div>
            <div className="step">
              <b>02</b>
              <span>AI-free OCR reads its text</span>
            </div>
            <div className="step">
              <b>03</b>
              <span>Check extracted fields</span>
            </div>
            <div className="step">
              <b>04</b>
              <span>Edit, confirm, and save</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
function Documents(){const{data:docs,reload}=useRemote('/documents');const[query,setQuery]=useState('');const[filter,setFilter]=useState('all');async function remove(id){if(!confirm('Delete this document and all saved extracted data?'))return;await api.delete('/documents/'+id);reload()}const reviewUrl = document => {
 const batch = (docs || []).filter(item => document.upload_batch ? item.upload_batch === document.upload_batch : !item.upload_batch && item.created_at === document.created_at).sort((a,b) => a.id-b.id);
 return batch.length > 1 && batch.length <= 5 ? '/documents/review?ids=' + batch.map(item => item.id).join(',') : '/documents/' + document.id;
};const visible=(docs||[]).filter(d=>(filter==='all'||d.status===filter)&&(d.filename.toLowerCase().includes(query.toLowerCase())||d.category.includes(query.toLowerCase())));return <><Heading tag="YOUR LIBRARY" title="Document history" subtitle="Access your extracted documents, review their data, or remove them." action={<NavLink className="primary" to="/upload"><Plus size={17}/> Upload</NavLink>}/><div className="panel"><div className="table-tools"><div className="search-box"><Search size={17}/><input placeholder="Search documents..." value={query} onChange={e=>setQuery(e.target.value)}/></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option><option value="review">Needs review</option><option value="reviewed">Reviewed</option><option value="failed">Failed</option></select></div>{docs?.length?<div className="table-wrap"><table><thead><tr><th>File name</th><th>Detected type</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr></thead><tbody>{visible.map(d=><tr key={d.id}><td><NavLink className="document-cell" to={reviewUrl(d)}><FileText size={18}/>{d.filename}</NavLink></td><td>{short(d.category)}</td><td><Status value={d.status}/></td><td>{date(d.created_at)}</td><td><div className="table-actions"><NavLink title="View" to={reviewUrl(d)}><Eye size={17}/></NavLink><button title="Delete" onClick={()=>remove(d.id)}><Trash2 size={17}/></button></div></td></tr>)}</tbody></table>{!visible.length&&<p className="table-no-results">No matching documents.</p>}</div>:<Empty title="Your library is empty" text="Upload your first document to see it here."/>}</div></>}
function BatchReview() {
  const location = useLocation();
  const ids = [...new Set((new URLSearchParams(location.search).get("ids") || "").split(",").filter(id => /^[1-9]\d*$/.test(id)))].slice(0, 5);

  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setGroups(null);setError('');
    Promise.all(ids.map(id => api.get('/documents/' + id).then(r => r.data.data))).then(docs => {
      const result = groupDocuments(docs);
      if(active) setGroups(result);
    }).catch(() => { if(active) setError('Could not load uploaded documents. Refresh to retry.'); });
    return () => { active = false; };
  }, [location.search]);
  if(error) return <div className="error">{error}</div>;
  if (!ids.length) return <Navigate to="/documents" replace />;
  return <>
    <Heading tag="UPLOAD RESULTS" title="Extracted information" subtitle={ids.length + " documents processed. Review the automatically filled fields for each document below."}/>
    {location.state?.failures?.length > 0 && <div className="warning" role="alert">Some documents could not be processed: {location.state.failures.join("; ")}</div>}
    {!groups && <p>Analyzing related documents...</p>}{groups?.map(group => <div key={group[0].id} style={{marginBottom: 40}}><DocumentDetail documentId={group[0].id} relatedDocuments={group}/></div>)}
  </>;
}
function OriginalPreview({doc}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl;
    api.get('/documents/' + doc.id + '/original', {responseType: 'blob'}).then(({data}) => {
      objectUrl = URL.createObjectURL(data);
      if(active) setUrl(objectUrl); else URL.revokeObjectURL(objectUrl);
    }).catch(() => { if(active) setError(true); });
    return () => {active = false; if(objectUrl) URL.revokeObjectURL(objectUrl);};
  }, [doc.id]);
  return <div className="document-side-preview">
    <h4 style={{overflowWrap: 'anywhere'}}>{doc.filename}</h4>
    {url ? <div className="original-preview">
      {doc.mime === 'application/pdf' ? <iframe src={url} title={doc.filename}/> : doc.mime.startsWith('image/') ? <img src={url} alt={doc.filename}/> : <a className="secondary" href={url} download={doc.filename}>Download original</a>}
    </div> : <p role="status">{error ? 'Original file unavailable.' : 'Loading original document...'}</p>}
  </div>;
}
function DocumentDetail({ documentId, relatedDocuments }) {
  const params = useParams();
  const id = documentId || params.id;
  const { data: doc, error, reload } = useRemote("/documents/" + id);
  const sources = source => relatedDocuments ? relatedDocuments.map(item => String(item.id) === String(source.id) ? source : item) : [source];
  const savedFields = useRef(null);
  useEffect(() => { savedFields.current = null; }, [id, relatedDocuments]);
  const mergedFields = source => savedFields.current || mergeDocumentFields(sources(source)).fields;
  const labels = doc ? mergeDocumentFields(sources(doc)).labels : {};
  const isAddressField = key => /address/i.test(key) || /address/i.test(labels[key] || '');
  const fieldOrder = key => /expiry|expiration|validUntil|validTill/i.test(key) || /expiry|expiration|valid\s*(until|till)/i.test(labels[key] || '') ? 2 : isAddressField(key) ? 1 : 0;
  const [fields, setFields] = useState(null);
  const [notice, setNotice] = useState("");
  const [showText, setShowText] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf");
  const [exportBusy, setExportBusy] = useState(false);
  const [fieldChoice, setFieldChoice] = useState("fullName");
  const [customField, setCustomField] = useState("");
  const fieldOptions = [
    ["Personal", [["fullName", "Name"], ["email", "Email ID"], ["phone", "Phone"], ["address", "Address"], ["dob", "Date of birth"], ["gender", "Gender"]]],
    ["Document", [["documentNumber", "Document number"], ["registrationNumber", "Registration number"], ["issueDate", "Issue date"], ["expiryDate", "Expiry date"], ["status", "Status"]]],
    ["Work and education", [["employer", "Employer"], ["designation", "Designation"], ["institution", "Institution"], ["qualification", "Qualification"], ["grade", "Grade"]]],
    ["Other details", [["amount", "Amount"], ["bloodGroup", "Blood group"], ["notes", "Notes"]]],
  ];
  useEffect(() => {
    if (doc) setFields(mergedFields(doc));
  }, [doc, relatedDocuments]);
  async function save() {
    const missing = (doc.requiredFields || []).filter(
      (key) => !String(fields[key] || "").trim(),
    );
    if (missing.length) {
      setNotice(
        "Complete required fields: " +
          missing.map((key) => short(key)).join(", ") +
          ".",
      );
      return;
    }
    try {
      for (const target of relatedDocuments || [{id}]) await api.patch("/extractions/" + target.id, { fields });
      savedFields.current = {...fields};
      setNotice("Changes saved successfully.");
      reload();
    } catch (e) {
      setNotice(e.response?.data?.error?.message || "Save failed");
    }
  }
  if (error) return <div className="error">{error}</div>;
  if (!doc || !fields)
    return <div className="loading">Loading document...</div>;
  return (
    <>
      <Heading
        tag="DOCUMENT REVIEW"
        title="Review extraction"
        subtitle={relatedDocuments?.map(item => item.filename).join(" + ") || doc.filename}
        action={
          <NavLink className="secondary" to="/documents">
            <ArrowRight size={16} /> Back to history
          </NavLink>
        }
      />
      <div className="review-grid">
        <section className="panel">
          <div className="panel-head">
            <h3>{relatedDocuments?.length > 1 ? `Original document ? ${relatedDocuments.length} pages / sides` : "Original document"}</h3>
            <Status value={doc.status} />
          </div>
          {(relatedDocuments || [doc]).map(item => <OriginalPreview key={item.id} doc={item}/>)}
          <button
            className="secondary wide"
            onClick={() => setShowText(!showText)}
          >
            <FileSearch size={17} />
            {showText ? "Hide" : "Show"} raw OCR text
          </button>
          {showText && (
            <pre className="ocr-text">{(relatedDocuments || [doc]).map(item => item.filename + "\n" + (item.text || "No recognized text.")).join("\n\n")}</pre>
          )}
          {doc.warnings?.map((w, i) => (
            <div className="warning" key={i}>
              <AlertTriangle size={16} />
              {w}
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Extracted information</h3>
              <p className="muted">
                Fields from all sides are filled automatically and combined below. Review the values before saving.
              </p>
            </div>
          </div>
          <div className="form-grid">
            {Object.entries(fields).sort(([a], [b]) => fieldOrder(a) - fieldOrder(b)).map(([k, v]) => (
              <label key={k} style={isAddressField(k) ? {gridColumn: "1 / -1"} : undefined}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "4px",
                    minHeight: "1em",
                  }}
                >
                  {labels[k] || short(k)}
                  {doc.requiredFields?.includes(k) && (
                    <abbr title="Required" aria-label="Required">
                      *
                    </abbr>
                  )}
                </span>
                {(isAddressField(k) || ["notes", "transactions", "address", "serviceAddress", "ownerAddress", "experience", "education", "findings", "recommendations"].includes(k) || String(v).includes("\n")) ? <textarea
                  rows={4}
                  required={doc.requiredFields?.includes(k)}
                  value={v}
                  onChange={(e) => setFields({ ...fields, [k]: e.target.value })}
                  placeholder={"Enter " + short(k).toLowerCase()}
                /> : <input
                  required={doc.requiredFields?.includes(k)}
                  value={v}
                  onChange={(e) =>
                    setFields({ ...fields, [k]: e.target.value })
                  }
                  placeholder={"Enter " + short(k).toLowerCase()}
                />}
              </label>
            ))}
          </div>
          {notice && <div className="notice">{notice}</div>}
          <div className="form-actions">
            <details className="add-field-menu">
              <summary className="secondary"><Plus size={17}/> Add field <span aria-hidden="true">?</span></summary>
              <div className="add-field-dropdown">
                {fieldOptions.map(([group, options]) => <div className="field-category" key={group}>
                  <h4>{group}</h4>
                  {options.map(([key, label]) => <button type="button" key={key} disabled={Object.hasOwn(fields,key)} onClick={e=>{
                    setFields({...fields,[key]:""});setNotice(label+" added. Enter its value, then confirm and save.");e.currentTarget.closest('details').removeAttribute('open');
                  }}>{label}{Object.hasOwn(fields,key)?" (already added)":""}</button>)}
                </div>)}
                <button type="button" className="secondary" onClick={()=>setFieldChoice("custom")}>Custom field?</button>
              {fieldChoice === "custom" && <label>Field name<input value={customField} onChange={e => setCustomField(e.target.value)} placeholder="For example: Fitness number" maxLength={80}/></label>}
            {fieldChoice === "custom" && <button className="secondary" onClick={() => {
              const label = fieldChoice === "custom" ? customField : fieldChoice;
              if (!label?.trim()) { setNotice("Enter a field name beside Add field."); return; }
              const words = label.match(/[A-Za-z0-9]+/g) || [];
              const key = fieldChoice === "custom" ? words.map((word, index) => index ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase()).join("") : fieldChoice;
              if (!/^[A-Za-z][A-Za-z0-9]{0,49}$/.test(key) || ["constructor", "prototype", "__proto__"].includes(key)) { setNotice("Enter a field name starting with a letter, up to 50 characters."); return; }
              if (Object.hasOwn(fields, key)) { setNotice("That field already exists."); return; }
              setFields({ ...fields, [key]: "" });
              setCustomField("");
              setNotice("Field added. Enter its value above, then confirm and save.");
            }}><Plus size={17} /> Add custom field</button>}
              </div>
            </details>
            <button className="secondary" onClick={() => setFields(mergedFields(doc))}>
              <RefreshCcw size={17} /> Reset
            </button>
            <button className="primary" onClick={save}>
              <CheckCircle2 size={17} /> Confirm & save
            </button>
          </div>
          <div className="document-download">
            <label>Download format <select value={exportFormat} onChange={e=>setExportFormat(e.target.value)}><option value="pdf">PDF</option><option value="xlsx">Excel (.xlsx)</option><option value="docx">Word (.docx)</option><option value="csv">CSV (.csv)</option><option value="tsv">TSV (.tsv)</option><option value="json">JSON (.json)</option><option value="txt">Plain text (.txt)</option><option value="html">Web page (.html)</option><option value="xml">XML (.xml)</option><option value="md">Markdown (.md)</option></select></label>
            <button className="secondary" disabled={exportBusy} onClick={async()=>{
              setExportBusy(true);
              try {const result=await api.post('/documents/'+id+'/export/'+exportFormat,{fields},{responseType:'blob'});const url=URL.createObjectURL(result.data);const link=document.createElement('a');link.href=url;link.download=doc.filename.replace(/\.[^.]+$/,'')+'-details.'+exportFormat;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
              catch {setNotice('Download failed. Please try again.');} finally {setExportBusy(false);}
            }}><Download size={17}/>{exportBusy?'Preparing?':'Download details'}</button>
          </div>
        </section>
      </div>
    </>
  );
}
function Profiles(){const{data:profiles,reload}=useRemote('/profiles');const{data:docs}=useRemote('/documents');const[selected,setSelected]=useState(null);const[documentIds,setDocumentIds]=useState([]);const[mergeMsg,setMergeMsg]=useState('');const[profile,setProfile]=useState(null);async function create(){const name=prompt('Applicant profile name:','New applicant');if(!name)return;const r=await api.post('/profiles',{name});reload();open(r.data.data.id)}async function open(id){const r=await api.get('/profiles/'+id);setSelected(id);setProfile(r.data.data);setMergeMsg('')}async function merge(){try{const r=await api.post(`/profiles/${selected}/merge-documents`,{documentIds});setProfile(r.data.data.profile);setMergeMsg(r.data.data.conflicts.length?'Conflicts found (existing values preserved): '+r.data.data.conflicts.map(c=>`${short(c.field)}: "${c.current}" vs "${c.incoming}" from document #${c.documentId}`).join(' • '):'Documents merged. Check fields before saving.')}catch(e){setMergeMsg(e.response?.data?.error?.message||'Merge failed')}}async function save(){await api.patch(`/profiles/${selected}`,{name:profile.name,fields:profile.fields});setMergeMsg('Profile saved.');reload()}async function exportFile(format){const r=await api.get(`/profiles/${selected}/export/${format}`,{responseType:'blob'});const a=document.createElement('a');a.href=URL.createObjectURL(r.data);a.download=`profile-${selected}.${format}`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}return <><Heading tag="APPLICANT MANAGEMENT" title="Applicant profiles" subtitle="Merge information from multiple documents into one editable record." action={<button className="primary" onClick={create}><Plus size={17}/> New profile</button>}/><div className="profiles-grid"><div className="panel"><h3>Profiles</h3><div className="profile-list">{profiles?.map(p=><button key={p.id} className={'profile-item '+(selected===p.id?'selected':'')} onClick={()=>open(p.id)}><div className="avatar">{p.name[0]?.toUpperCase()}</div><span><b>{p.name}</b><small>Created {date(p.created_at)}</small></span><ChevronRight size={17}/></button>)}{profiles?.length===0&&<p className="muted">No profiles yet. Create one to merge documents.</p>}</div></div><div className="panel">{profile?<><div className="panel-head"><h3>Edit applicant</h3><div className="export-actions"><button className="secondary small-button" onClick={()=>exportFile('json')}><Download size={15}/> JSON</button><button className="secondary small-button" onClick={()=>exportFile('csv')}><Download size={15}/> CSV</button></div></div><label>Profile name<input value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></label><div className="merge-area"><h4>Merge reviewed documents</h4><p className="muted">Select your documents. Conflicting values will be reported, not overwritten.</p><div className="doc-choices">{docs?.filter(d=>['review','reviewed'].includes(d.status)).map(d=><label key={d.id}><input type="checkbox" checked={documentIds.includes(d.id)} onChange={e=>setDocumentIds(e.target.checked?[...documentIds,d.id]:documentIds.filter(v=>v!==d.id))}/>{d.filename} <small>#{d.id}</small></label>)}</div><button className="secondary" disabled={!documentIds.length} onClick={merge}><Files size={16}/> Merge selected</button></div>{mergeMsg&&<div className="notice">{mergeMsg}</div>}<div className="form-grid">{Object.entries(profile.fields).map(([k,v])=><label key={k}>{short(k)}{profile.sources[k]&&<small>Source document #{profile.sources[k]}</small>}<input value={v} onChange={e=>setProfile({...profile,fields:{...profile.fields,[k]:e.target.value}})}/></label>)}</div><button className="primary" onClick={save}><CheckCircle2 size={17}/> Save profile</button></>:<div className="profile-placeholder"><Users size={38}/><h3>Select an applicant profile</h3><p>Manage extracted fields and merge document information.</p></div>}</div></div></>}
function Analytics(){const{data:stats}=useRemote('/dashboard/stats');const data=Object.entries(stats?.byType||{}).map(([name,count])=>({name:short(name),count}));return <><Heading tag="INSIGHTS" title="Analytics" subtitle="A snapshot of your processing performance and document mix."/><div className="stats-grid"><div className="stat-card"><div className="stat-num">{stats?.total||0}</div><div className="stat-label">Total uploads</div></div><div className="stat-card"><div className="stat-num">{stats?.processed||0}</div><div className="stat-label">Processed</div></div><div className="stat-card"><div className="stat-num">{stats?.reviewed||0}</div><div className="stat-label">Confirmed</div></div><div className="stat-card"><div className="stat-num">{stats?.failed||0}</div><div className="stat-label">Failures</div></div></div><div className="panel"><div className="panel-head"><h3>Document types</h3></div>{data.length?<div style={{width:'100%',height:320}}><ResponsiveContainer><BarChart data={data} margin={{left:0,right:15,top:15,bottom:5}}><CartesianGrid vertical={false} strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#4f46e5" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div>:<div className="chart-empty">Upload documents to generate your analytics.</div>}</div></>}
function SettingsPage(){const{user,theme,setTheme}=useAuth();return <><Heading tag="WORKSPACE" title="Settings" subtitle="Your account and local application preferences."/><div className="settings-grid"><div className="panel"><h3>Account</h3><div className="settings-row"><UserRound/><span><b>Name</b><small>{user?.name}</small></span></div><div className="settings-row"><Mail/><span><b>Email</b><small>{user?.email}</small></span></div></div><div className="panel"><h3>Preferences</h3><div className="settings-row"><Sun/><span><b>Appearance</b><small>Switch between light and dark theme.</small></span><button className="secondary" onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?'Dark mode':'Light mode'}</button></div><div className="settings-row"><ShieldCheck/><span><b>Data privacy</b><small>Files are processed locally. Stored OCR text is masked for Aadhaar-like numbers.</small></span></div></div></div></>}
createRoot(document.getElementById('root')).render(<App/>);
