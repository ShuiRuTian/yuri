use anyhow::{Context, Result};
use rcgen::{BasicConstraints, CertificateParams, DistinguishedName, DnType, IsCa, KeyPair};
use std::fs;
use std::path::PathBuf;

pub struct CaManager {
    pub cert_path: PathBuf,
    pub key_path: PathBuf,
    pub cert_pem: String,
    pub key_pem: String,
}

impl CaManager {
    pub fn new(app_dir: PathBuf) -> Result<Self> {
        let cert_path = app_dir.join("yuri_ca.pem");
        let key_path = app_dir.join("yuri_ca.key");

        if cert_path.exists() && key_path.exists() {
            let cert_pem = fs::read_to_string(&cert_path).context("Failed to read CA cert")?;
            let key_pem = fs::read_to_string(&key_path).context("Failed to read CA key")?;
            return Ok(Self {
                cert_path,
                key_path,
                cert_pem,
                key_pem,
            });
        }

        // Generate new CA (rcgen 0.13 style)
        let mut params = CertificateParams::default();
        let mut dn = DistinguishedName::new();
        dn.push(DnType::CommonName, "Yuri Proxy CA");
        dn.push(DnType::OrganizationName, "Yuri App");
        params.distinguished_name = dn;
        params.is_ca = IsCa::Ca(BasicConstraints::Constrained(0));

        let key_pair = KeyPair::generate()?;
        let cert = params.self_signed(&key_pair)?;

        let cert_pem = cert.pem();
        let key_pem = key_pair.serialize_pem();

        if !app_dir.exists() {
            fs::create_dir_all(&app_dir)?;
        }

        fs::write(&cert_path, &cert_pem)?;
        fs::write(&key_path, &key_pem)?;

        Ok(Self {
            cert_path,
            key_path,
            cert_pem,
            key_pem,
        })
    }

    pub fn get_ca_pem(&self) -> String {
        self.cert_pem.clone()
    }
}
