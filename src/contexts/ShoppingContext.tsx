import axios from "axios";
import { createContext, useContext, useState, type ReactNode } from "react";

interface ShoppingContextType {
    purchased: any;
    error: boolean|string;
    loading: boolean;
    getPurchased: any;
}
const ShoppingContext = createContext<ShoppingContextType|undefined>(undefined)

interface ProviderProps {
  children: ReactNode;
}

export const ShoppingProvider = ({ children }: ProviderProps) => {
    const [ purchased, setPurchased ] = useState("")
    const [ error, setError ] = useState<boolean>(false)
    const [ loading, setLoading ] = useState<boolean>(false)

    const getPurchased = async (user:string) => {
        try {
            setError(false)
            setLoading(true)

            const response = await axios.post(`${import.meta.env.VITE_API_URL}/tickets`, { email: user })
            if(response.status === 200){
                setPurchased(response.data)
            }
        } catch (error) {
            setError(true)
            console.error("Error al conseguir tickets! 🔴", error)
        } finally {
            setLoading(false)
        }
    }

    return(
        <ShoppingContext.Provider value={{ purchased, error, loading, getPurchased }}>
            { children }
        </ShoppingContext.Provider>
    )
}

export const UseShopping = () => {
  const context = useContext(ShoppingContext);

  if (!context) {
    throw new Error("useShopping debe ser usado dentro de un ThemeProvider");
  }
  return context; 
};

