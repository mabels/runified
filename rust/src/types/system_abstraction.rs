// use std::lazy::SyncOnceCell;

use std::sync::RwLock;
// use std::pin::Pin;
use std::rc::Rc;


pub trait TimeIf {
	fn now(&mut self) -> chrono::DateTime<chrono::FixedOffset>;
}

// #[derive(Clone)]
pub struct OsTimeImpl {}

impl TimeIf for OsTimeImpl {
    fn now(&mut self) -> chrono::DateTime<chrono::FixedOffset> {
        return chrono::Local::now().into();
    }
}


pub trait SysAbstraction {
	// fn time(&mut self) -> Box<dyn TimeIf>;
	fn time(&self) -> Rc<dyn TimeIf>;
}

pub struct OsAbstraction {
    osTimeImpl: Rc<OsTimeImpl>
}


impl SysAbstraction for OsAbstraction {
    fn time(&self) -> Rc<dyn TimeIf> {
        return Rc::clone(self.osTimeImpl)
    }
}

pub struct StepTimeImpl {
    now: RwLock<chrono::DateTime<chrono::FixedOffset>>
}
impl TimeIf for StepTimeImpl {
    fn now(&mut self) -> chrono::DateTime<chrono::FixedOffset> {
        let now = self.now.read().unwrap().clone();
        let next = *now + chrono::Duration::seconds(1);
        *self.now.write().unwrap() = next;
        return next
    }
}

pub struct StepAbstraction {
    timeIf: Rc<StepTimeImpl>
}

impl SysAbstraction for StepAbstraction {
    fn time(&self) -> Rc<dyn TimeIf> {
        return Rc::clone(self.timeIf)
    }
}

pub struct ConstTimeImpl {
    now: chrono::DateTime<chrono::FixedOffset>
}

impl TimeIf for ConstTimeImpl {
    fn now(&mut self) -> chrono::DateTime<chrono::FixedOffset> {
        return self.now;
    }
}

pub struct ConstAbstraction {
    timeIf: Rc<ConstTimeImpl>
}

impl SysAbstraction for ConstAbstraction {
    fn time(&self) -> Rc<dyn TimeIf> {
        return Rc::clone(self.timeIf)
    }
}

pub fn SysAbstractionFactory(name: String) -> Rc<dyn SysAbstraction> {
    match name.as_str() {
        "real"=> return Rc::new(OsAbstraction{
            osTimeImpl:  Rc::new(OsTimeImpl{})
        }),
        "const"=> {
            let sa : Box<ConstAbstraction> = Box::new(
                    ConstAbstraction{
                        timeIf: ConstTimeImpl{
                            now: chrono::DateTime::parse_from_rfc2822("2020-04-12T22:10:57+02:00").unwrap(),
                        }
                    }
                );
            // let cti = ConstTimeImpl{
                // now: chrono::DateTime::parse_from_rfc2822("2020-04-12T22:10:57+02:00").unwrap(),
            // };

            return sa // Box::new(ConstAbstraction{ time: Box::new(cti)})
        }
        "step"=> return Box::new(StepAbstraction{
            timeIf: StepTimeImpl{
                now: RwLock::new(Arc::new(chrono::DateTime::parse_from_rfc2822("2020-04-12T22:10:57+02:00").unwrap())),
            }
        }),
        _=> return Box::new(OsAbstraction{
            osTimeImpl: OsTimeImpl{}
        }),
    }
    // return OsAbstraction{};
}



#[cfg(test)]
mod tests {
    // Note this useful idiom: importing names from outer (for mod tests) scope.
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn test_real_time() -> Result<(), String> {
        let tif = SysAbstractionFactory("real".into());
        let now0 = tif.time().now();
        let now1 = tif.time().now();
        assert_eq!(now0 < now1, true);
        Ok(())
    }
    #[test]
    fn test_const_time() -> Result<(), String> {
        let tif = SysAbstractionFactory("const".into());
        let now0 = tif.time().now();
        let now1 = tif.time().now();
        assert_eq!(now0, now1);
        Ok(())
    }
    #[test]
    fn test_step_time() -> Result<(), String> {
        let tif = SysAbstractionFactory("step".into());
        let now0 = tif.time().now();
        let now1 = tif.time().now();
        let dif = now1 - now0;
        assert_eq!(dif.num_seconds(), 1);
        Ok(())
    }
}


