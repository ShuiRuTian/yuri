import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#00E676", // Vibrant Green
            contrastText: "#000000",
        },
        secondary: {
            main: "#FF4081", // Pink accent
        },
        background: {
            default: "#121212",
            paper: "#1E1E1E",
        },
        text: {
            primary: "#E0E0E0",
            secondary: "#A0A0A0",
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        button: {
            textTransform: "none",
            fontWeight: 600,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: "none",
                    borderRadius: 0, // Sharper edges for pro tools
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: "#1E1E1E",
                    backgroundImage: "none",
                    borderBottom: "1px solid #333",
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    "&.Mui-selected": {
                        backgroundColor: "rgba(0, 230, 118, 0.12)",
                        borderLeft: "3px solid #00E676",
                        "&:hover": {
                            backgroundColor: "rgba(0, 230, 118, 0.20)",
                        },
                    }
                }
            }
        }
    },
});
