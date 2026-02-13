export const resumer={
    resume_text:null,
    resume_attribute:null,
    resume_state:null,
    resume_if:null,
    resume_switch:null,
    resume_for:null,
    resume_component:null,
}


/**
 * @param {resumer} resume
 */
export const setResumer=(resume)=>{
    for(const [key,value] of Object.entries(resume)){
            resumer[key]=value
    }
}