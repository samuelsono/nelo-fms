import { Button } from "primereact/button";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../store/userStore";
import { Toast } from "primereact/toast";
import { Menu } from "primereact/menu";

const linkList = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Vehicles', path: '/vehicles' },
    { label: 'Units', path: '/units' },
    { label: 'Sims', path: '/sims' },
    { label: 'Live Data', path: '/live-data' },
    { label: 'Tracking', path: '/tracking' },
]

const Navbar = () => {
  const { user, setUser } = useUserStore();
  const navigate = useNavigate();
  const menuRight = useRef(null);
  const toast = useRef(null);

  const items = [
        { 
            label: user?.name || 'User', 
            items: [
                { label: 'Profile', icon: 'pi pi-user', command: () => { navigate('/profile'); } },
                { label: 'Settings', icon: 'pi pi-cog', command: () => { navigate('/settings'); } },
                { label: 'Logout', icon: 'pi pi-sign-out', command: () => {
                    setUser(null);
                    navigate('/login');
                }}
            ]   
        }
    ];

  useEffect(() => {
    if(!user) {
        navigate('/login');
    }
  }, [user]);
    
  return (
    <nav className="flex justify-between items-center w-full shadow h-12 px-4">
        <Toast ref={toast}></Toast>
      <div className='flex items-center container mx-auto'>
          <div className='flex flex-col mr-auto'>
               <p className="text-xl font-bold text-indigo-600"><span className="font-thin text-indigo-400">nelo</span>fms</p>
          </div>
          <div className="flex items-center gap-4 mr-auto">
             {linkList.map(link => (
               <Button key={link.path} label={link.label} className="p-button-text" onClick={() => navigate(link.path)} />
             ))}
          </div>
          { user ? <div className=''>
                <Menu model={items} popup ref={menuRight} id="popup_menu_right" popupAlignment="right" />
                <Button link icon="pi pi-ellipsis-v" className="mr-2" onClick={(event) => menuRight?.current.toggle(event)} aria-controls="popup_menu_right" aria-haspopup />
          </div> : <div>
                
                <Button label="Logout" icon="pi pi-sign-out" className="p-button-text" onClick={() => {
                  setUser(null);
                  navigate('/login');
                }} />
            </div>}
      </div>
    </nav>
  );
}
export default Navbar;