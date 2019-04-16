import { expect } from 'chai';
import { merge } from '../src/merge'
import { DeepPartial } from '../src/deep.partial';

describe('Stack', () => {
    it('check that non provided references are the same after merge', () => {

        const obj1 = {
            data1: {
                prop1: 'say knock',
                prop2: 1,
                prop3: true,
                someArray: [] as any[]
            },
            data2: {
                inner: {
                    innerProp1: 'deeply nested property',
                    innerProp2: 12345,
                    innerProp3: false
                },
                someProp: 9999
            }
        }

        const obj2 : DeepPartial<typeof obj1> = {
            data1: { prop1: 'knock knock knock' }
        }

        const newObj = merge(obj1, obj2);
        
        expect(newObj.data1 !== obj1.data1).to.equal(true);
        expect(newObj.data1.prop1 !== obj1.data1.prop1).to.equal(true);
        expect(newObj.data1.prop2 === obj1.data1.prop2).to.equal(true);
        expect(newObj.data1.someArray === obj1.data1.someArray).to.equal(true);
        expect(newObj.data2 === obj1.data2).to.equal(true);
    });
    
});