import React, { useEffect } from 'react'; 
import { InputText } from "primereact/inputtext";
import { Button } from 'primereact/button';
import { useUserStore } from '../store/userStore';
import { useNavigate } from 'react-router-dom';
import { authService } from '../apis/auth-service';

export default function LoginPage() {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);

    const [error, setError] = React.useState('');
    const { user, setUser, setError: setStoreError } = useUserStore();
    const navigate = useNavigate();

    const login = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await authService.login(email, password);
            authService.storeToken(response.token);
            
            setUser({
                id: email,
                email: response.email || email,
                name: response.email?.split('@')[0] || 'User',
                role: response.roles?.[0] || 'user',
                token: response.token,
            });
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Login failed. Please try again.';
            setError(errorMsg);
            setStoreError(errorMsg);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if(user) {
            console.log('User logged in:', user);
            navigate('/dashboard');
        }
    }, [user, navigate]);

    return (
        <div className="flex flex-col justify-center gap-2 min-w-[360px] w-1/5 xl:w-1/6">
            <div className='flex flex-col items-center mx-auto'>
                <p className="text-2xl font-black text-indigo-700">FMS</p>
            </div>
            <div className='flex flex-col'>
                <label className='text-lg font-bold mb-1'>Login to your account</label>
                <span className='text-sm text-gray-600'>Enter your credentials to access your account</span>
            </div>
            {error && <span className='text-sm text-red-600'>{error}</span>}
            <InputText 
                className="p-inputtext-sm" 
                placeholder='Email' 
                value={email} 
                onChange={(e:any) => setEmail(e.target.value)}
                disabled={loading}
            />
            <div className='relative flex items-center'>

                <InputText 
                    className="p-inputtext-sm flex-1 pr-10 w-full" 
                    placeholder='Password' 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e:any) => setPassword(e.target.value)}
                    disabled={loading}
                    
                />

                <Button 
                    link 
                    icon={showPassword ? "pi pi-eye-slash" : "pi pi-eye"} 
                    className='absolute! right-1 p-0' 
                    onClick={() => setShowPassword(!showPassword)}
                    type='button'
                />
            </div>

            <Button 
                label={loading ? "Logging in..." : "Login"} 
                className="p-button-sm" 
                onClick={login}
                disabled={loading}
            />
            <a href='' className='text-indigo-700'>Forgot password?</a>
            <span className='text-sm text-gray-600'>Demo: admin@localhost / Admin123!</span>
        </div>
    )
}